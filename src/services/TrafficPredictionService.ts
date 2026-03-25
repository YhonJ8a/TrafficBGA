import axios from 'axios';
import { AppDataSource } from '../database/db';
import { TrafficRouteData } from '../entities/TrafficRouteData';
import { ROUTES_INFO } from '../data/constantes';

export interface PredictionInput {
    routeName: string;
    hour: number;
    dayOfWeek: number;
    month: number;
    isWeekend: boolean;
}

export interface PredictionOutput {
    // Predicciones básicas
    predictedDurationTraffic: number;
    predictedCongestionIndex: number;
    predictedAvgSpeed: number;

    // Datos enriquecidos para el frontend
    routeName: string;
    datetime: string;
    confidence: number;

    // Tiempos formateados
    durationFormatted: string; // "8 min 30 seg"
    durationNormalFormatted: string; // "7 min"
    delayFormatted: string; // "+1 min 30 seg"

    // Comparaciones
    comparedToNormal: {
        percentageIncrease: number; // 21.4
        isSlower: boolean;
        message: string; // "21% más lento que lo normal"
    };

    // Nivel de tráfico
    trafficLevel: {
        level: 'libre' | 'fluido' | 'moderado' | 'congestionado' | 'muy_congestionado';
        color: string; // Para UI: "#4CAF50", "#FFC107", etc.
        icon: string; // "🟢", "🟡", "🔴"
        description: string; // "Tráfico fluido"
    };

    // Recomendaciones
    recommendation: {
        shouldAvoid: boolean;
        message: string;
        alternativeTime?: string; // "Mejor hora: 6:30 AM"
    };

    // Datos históricos
    historical: {
        avgDurationNormal: number;
        avgDurationTraffic: number;
        avgCongestionIndex: number;
        avgSpeed: number;
        sampleCount: number;
    };

    // Metadata
    metadata: {
        predictedAt: string;
        modelVersion: string;
        dataQuality: 'high' | 'medium' | 'low';
    };
    ruta?: typeof ROUTES_INFO[0];
}

export class TrafficPredictionService {
    private mlServiceUrl: string;

    constructor() {
        this.mlServiceUrl = process.env.ML_SERVICE_URL || 'http://localhost:5000';
    }

    async checkMLService(): Promise<boolean> {
        try {
            const response = await axios.get(`${this.mlServiceUrl}/health`, {
                timeout: 5000
            });
            return response.data.status === 'ok';
        } catch (error) {
            console.error('❌ Servicio ML no disponible:', error);
            return false;
        }
    }

    async trainModel(daysBack: number = 7, testSize: number = 0.2): Promise<any> {
        try {
            const response = await axios.post(`${this.mlServiceUrl}/train`, {
                daysBack,
                testSize
            }, {
                timeout: 300000
            });

            return response.data;
        } catch (error: any) {
            throw new Error(`Error entrenando modelo: ${error.message}`);
        }
    }

    async predict(input: PredictionInput): Promise<PredictionOutput> {
        try {
            // Obtener datos históricos para esta ruta
            const historicalData = await this.getHistoricalAverage(input.routeName);
            const sampleCount = await this.getSampleCount(input.routeName, input.hour);

            const targetDate = new Date();
            targetDate.setHours(input.hour);

            const response = await axios.post(`${this.mlServiceUrl}/predict`, {
                routeName: input.routeName,
                datetime: targetDate.toISOString(),
                durationNormal: historicalData.avgDurationNormal,
                distanceMeters: historicalData.avgDistanceMeters
            }, {
                timeout: 10000
            });

            const confidence = await this.calculateConfidence(input);

            // Datos de la predicción
            const predictedDuration = response.data.predictedDurationTraffic;
            const predictedCongestion = response.data.predictedCongestionIndex;
            const predictedSpeed = response.data.predictedAvgSpeed;
            const normalDuration = historicalData.avgDurationNormal;

            // Calcular delay
            const delay = predictedDuration - normalDuration;
            const percentageIncrease = ((delay / normalDuration) * 100);

            // Determinar nivel de tráfico
            const trafficLevel = this.getTrafficLevel(predictedCongestion);

            // Generar recomendación
            const recommendation = await this.generateRecommendation(
                predictedCongestion,
                input.hour,
                input.routeName
            );

            // Formatear tiempos
            const durationFormatted = this.formatDuration(predictedDuration);
            const durationNormalFormatted = this.formatDuration(normalDuration);
            const delayFormatted = this.formatDuration(Math.abs(delay), delay >= 0 ? '+' : '-');

            // Determinar calidad de datos
            const dataQuality = this.getDataQuality(sampleCount, confidence);

            return {
                // Predicciones básicas
                predictedDurationTraffic: Math.round(predictedDuration),
                predictedCongestionIndex: Math.round(predictedCongestion * 100) / 100,
                predictedAvgSpeed: Math.round(predictedSpeed * 100) / 100,

                // Info básica
                routeName: input.routeName,
                datetime: targetDate.toISOString(),
                confidence: Math.round(confidence * 100) / 100,

                // Tiempos formateados
                durationFormatted,
                durationNormalFormatted,
                delayFormatted,

                // Comparaciones
                comparedToNormal: {
                    percentageIncrease: Math.round(percentageIncrease * 10) / 10,
                    isSlower: delay > 0,
                    message: this.getComparisonMessage(percentageIncrease, delay)
                },

                // Nivel de tráfico
                trafficLevel,

                // Recomendaciones
                recommendation,

                // Datos históricos
                historical: {
                    avgDurationNormal: Math.round(historicalData.avgDurationNormal),
                    avgDurationTraffic: Math.round(historicalData.avgDurationTraffic),
                    avgCongestionIndex: Math.round(historicalData.avgCongestionIndex * 100) / 100,
                    avgSpeed: Math.round(historicalData.avgSpeed * 100) / 100,
                    sampleCount
                },

                // Metadata
                metadata: {
                    predictedAt: new Date().toISOString(),
                    modelVersion: 'v1.0-randomforest',
                    dataQuality
                }
            };
        } catch (error: any) {
            throw new Error(`Error en predicción: ${error.message}`);
        }
    }

    private formatDuration(seconds: number, prefix: string = ''): string {
        const absSeconds = Math.abs(seconds);
        const minutes = Math.floor(absSeconds / 60);
        const secs = Math.round(absSeconds % 60);

        if (minutes === 0) {
            return `${prefix}${secs} seg`;
        } else if (secs === 0) {
            return `${prefix}${minutes} min`;
        } else {
            return `${prefix}${minutes} min ${secs} seg`;
        }
    }

    private getComparisonMessage(percentageIncrease: number, delay: number): string {
        if (Math.abs(percentageIncrease) < 5) {
            return "Similar al tiempo normal";
        } else if (delay > 0) {
            return `${Math.round(percentageIncrease)}% más lento que lo normal`;
        } else {
            return `${Math.round(Math.abs(percentageIncrease))}% más rápido que lo normal`;
        }
    }

    async predictNextHours(routeName: string, hours: number = 12): Promise<any[]> {
        const now = new Date();
        const historicalData = await this.getHistoricalAverage(routeName);

        console.log(historicalData);

        const batchInput = [];
        for (let i = 0; i < hours; i++) {
            const targetDate = new Date(now.getTime() + i * 60 * 60 * 1000);

            batchInput.push({
                routeName,
                datetime: targetDate.toISOString(),
                durationNormal: historicalData.avgDurationNormal,
                distanceMeters: historicalData.avgDistanceMeters
            });
        }

        try {
            const response = await axios.post(`${this.mlServiceUrl}/predict/batch`, {
                predictions: batchInput
            }, {
                timeout: 30000
            });

            return response.data.predictions.map((pred: any, index: number) => ({
                hour: (now.getHours() + index) % 24,
                ...pred,
                coods: {
                    origen: { latitud: historicalData.originLat, longitud: historicalData.originLng },
                    destino: { latitud: historicalData.destLat, longitud: historicalData.destLng }
                }
            }));
        } catch (error: any) {
            throw new Error(`Error en predicción por lote: ${error.message}`);
        }
    }

    private async getHistoricalAverage(routeName: string): Promise<any> {
        const repository = AppDataSource.getRepository(TrafficRouteData);

        const result = await repository
            .createQueryBuilder('traffic')
            .select('AVG(traffic.durationNormal)', 'avgDurationNormal')
            .addSelect('AVG(traffic.durationTraffic)', 'avgDurationTraffic')
            .addSelect('AVG(traffic.congestionIndex)', 'avgCongestionIndex')
            .addSelect('AVG(traffic.avgSpeed)', 'avgSpeed')
            .addSelect('AVG(traffic.distanceMeters)', 'avgDistanceMeters')
            .where('traffic.routeName LIKE :routeName', { routeName: `${routeName}%` })
            .getRawOne();

        return {
            avgDurationNormal: parseFloat(result?.avgDurationNormal || '300'),
            avgDurationTraffic: parseFloat(result?.avgDurationTraffic || '400'),
            avgCongestionIndex: parseFloat(result?.avgCongestionIndex || '20'),
            avgSpeed: parseFloat(result?.avgSpeed || '30'),
            avgDistanceMeters: parseFloat(result?.avgDistanceMeters || '1500')
        };
    }

    private async calculateConfidence(input: PredictionInput): Promise<number> {
        const repository = AppDataSource.getRepository(TrafficRouteData);

        const count = await repository
            .createQueryBuilder('traffic')
            .where('traffic.routeName LIKE :routeName', { routeName: `${input.routeName}%` })
            .andWhere('HOUR(traffic.timestamp) = :hour', { hour: input.hour })
            .getCount();

        if (count >= 20) return 0.95;
        if (count >= 10) return 0.80;
        if (count >= 5) return 0.65;
        if (count >= 2) return 0.50;
        return 0.30;
    }

    private getTrafficLevel(congestionIndex: number): {
        level: 'libre' | 'fluido' | 'moderado' | 'congestionado' | 'muy_congestionado';
        color: string;
        icon: string;
        description: string;
    } {
        if (congestionIndex < 5) {
            return {
                level: 'libre',
                color: '#4CAF50',
                icon: '🟢',
                description: 'Vía libre'
            };
        } else if (congestionIndex < 15) {
            return {
                level: 'fluido',
                color: '#8BC34A',
                icon: '🟢',
                description: 'Tráfico fluido'
            };
        } else if (congestionIndex < 30) {
            return {
                level: 'moderado',
                color: '#FFC107',
                icon: '🟡',
                description: 'Tráfico moderado'
            };
        } else if (congestionIndex < 50) {
            return {
                level: 'congestionado',
                color: '#FF9800',
                icon: '🟠',
                description: 'Tráfico congestionado'
            };
        } else {
            return {
                level: 'muy_congestionado',
                color: '#F44336',
                icon: '🔴',
                description: 'Muy congestionado'
            };
        }
    }

    private async generateRecommendation(
        congestionIndex: number,
        currentHour: number,
        routeName: string
    ): Promise<{
        shouldAvoid: boolean;
        message: string;
        alternativeTime?: string;
    }> {
        // Recomendar evitar si congestión > 40%
        if (congestionIndex > 40) {
            // Buscar mejor hora en las próximas 3 horas
            const betterHour = await this.findBetterHour(routeName, currentHour);

            return {
                shouldAvoid: true,
                message: '⚠️ Se recomienda evitar esta ruta en este momento',
                alternativeTime: betterHour ? `Mejor hora: ${betterHour}` : undefined
            };
        } else if (congestionIndex > 25) {
            return {
                shouldAvoid: false,
                message: 'ℹ️ Considera rutas alternativas',
                alternativeTime: undefined
            };
        } else {
            return {
                shouldAvoid: false,
                message: '✅ Buen momento para tomar esta ruta',
                alternativeTime: undefined
            };
        }
    }

    private async findBetterHour(routeName: string, currentHour: number): Promise<string | null> {
        // Buscar en las próximas 3 horas
        let bestHour = null;
        let lowestCongestion = Infinity;

        for (let i = 1; i <= 3; i++) {
            const hour = (currentHour + i) % 24;

            try {
                const prediction = await this.predict({
                    routeName,
                    hour,
                    dayOfWeek: new Date().getDay(),
                    month: new Date().getMonth(),
                    isWeekend: new Date().getDay() === 0 || new Date().getDay() === 6
                });

                if (prediction.predictedCongestionIndex < lowestCongestion) {
                    lowestCongestion = prediction.predictedCongestionIndex;
                    bestHour = hour;
                }
            } catch (error) {
                // Ignorar errores
            }
        }

        if (bestHour !== null) {
            const period = bestHour < 12 ? 'AM' : 'PM';
            const displayHour = bestHour === 0 ? 12 : bestHour > 12 ? bestHour - 12 : bestHour;
            return `${displayHour}:00 ${period}`;
        }

        return null;
    }

    private getDataQuality(sampleCount: number, confidence: number): 'high' | 'medium' | 'low' {
        return (sampleCount >= 20 && confidence >= 0.8 ? 'high' : (sampleCount >= 10 && confidence >= 0.6 ? 'medium' : 'low'));
    }

    private async getSampleCount(routeName: string, hour: number): Promise<number> {
        const repository = AppDataSource.getRepository(TrafficRouteData);

        return await repository
            .createQueryBuilder('traffic')
            .where('traffic.routeName LIKE :routeName', { routeName: `${routeName}%` })
            .andWhere('HOUR(traffic.timestamp) = :hour', { hour })
            .getCount();
    }
}

