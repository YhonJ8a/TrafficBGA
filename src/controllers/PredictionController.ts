import { Request, Response } from "express";
import { TrafficPredictionService } from "../services/TrafficPredictionService";
import { AVAILABLE_ROUTES, ROUTES_INFO } from "../data/constantes";
import { PredictionOutput } from "../services/TrafficPredictionService";

const predictionService = new TrafficPredictionService();

const AllRoutes = ROUTES_INFO.flatMap(route => [
    {
        name: `${route.name} (ida)`,
        origin: route.origin,
        destination: route.destination,
        direction: 'ida'
    },
    {
        name: `${route.name} (vuelta)`,
        origin: route.destination,
        destination: route.origin,
        direction: 'vuelta'
    }
]);

export const checkMLService = async (req: Request, res: Response): Promise<void> => {
    try {
        const isActive = await predictionService.checkMLService();
        res.success(isActive);
    } catch (error: any) {
        res.error(error.message, 500);
    }
}

export const trainModel = async (req: Request, res: Response): Promise<void> => {
    try {
        const trainingModel = await predictionService.trainModel();
        res.success(trainingModel);
    } catch (error: any) {
        res.error(error.message, 500);
    }
}

export const predict = async (req: Request, res: Response): Promise<void> => {
    try {
        const { routeName, hour = 12, dayOfWeek = 1, month = 1, isWeekend = false } = req.body;
        if (!routeName) {
            res.error('Definir nombre de la ruta', 400);
            return;
        }
        const predicting = await predictionService
            .predict({ routeName, hour, dayOfWeek, month, isWeekend });
        res.success(predicting);
    } catch (error: any) {
        res.error(error.message, 500);
    }
}

export const predictNextHours = async (req: Request, res: Response): Promise<void> => {
    try {
        const { routeName, hours } = req.body;
        if (!routeName) {
            res.error('Definir nombre de la ruta', 400);
            return;
        }
        const predicting = await predictionService
            .predictNextHours(routeName, hours);
        res.success(predicting);
    } catch (error: any) {
        res.error(error.message, 500);
    }
}

export const predictAllRoutes = async (req: Request, res: Response): Promise<void> => {
    try {
        const { datetime } = req.body;
        const targetDate = datetime ? new Date(datetime) : new Date();

        console.log(`🔮 Prediciendo todas las rutas para ${targetDate.toISOString()}`);

        const predictions: PredictionOutput[] = [];
        const errors: { routeName: string; error: string }[] = [];

        // Predecir cada ruta en paralelo (más rápido)
        const predictionPromises = AVAILABLE_ROUTES.map(async (routeName): Promise<{
            success: boolean;
            routeName: string;
            prediction?: PredictionOutput;
            ruta?: typeof ROUTES_INFO[0];
            error?: string
        }> => {
            try {
                const prediction = await predictionService.predict({
                    routeName,
                    hour: targetDate.getHours(),
                    dayOfWeek: targetDate.getDay(),
                    month: targetDate.getMonth(),
                    isWeekend: targetDate.getDay() === 0 || targetDate.getDay() === 6
                });

                const ruta = AllRoutes.find(route => route.name === routeName);

                return {
                    success: true,
                    routeName,
                    prediction: { ...prediction, ruta },
                };
            } catch (error: any) {
                return {
                    success: false,
                    routeName,
                    error: error.message
                };
            }
        });

        // Esperar todas las predicciones
        const results = await Promise.all(predictionPromises);

        // Separar éxitos y errores
        results.forEach(result => {
            if (result.success) {
                predictions.push(result.prediction!);
            } else {
                errors.push({
                    routeName: result.routeName,
                    error: result.error!
                });
            }
        });

        // Ordenar por nivel de congestión (más congestionadas primero)
        predictions.sort((a, b) =>
            b.predictedCongestionIndex - a.predictedCongestionIndex
        );

        // Calcular estadísticas generales
        const stats = {
            totalRoutes: AVAILABLE_ROUTES.length,
            successful: predictions.length,
            failed: errors.length,
            avgCongestionIndex: predictions.length > 0
                ? predictions.reduce((sum, p) => sum + p.predictedCongestionIndex, 0) / predictions.length
                : 0,
            mostCongested: predictions[0]?.routeName || null,
            leastCongested: predictions[predictions.length - 1]?.routeName || null,
            routesByLevel: {
                libre: predictions.filter(p => p.trafficLevel.level === 'libre').length,
                fluido: predictions.filter(p => p.trafficLevel.level === 'fluido').length,
                moderado: predictions.filter(p => p.trafficLevel.level === 'moderado').length,
                congestionado: predictions.filter(p => p.trafficLevel.level === 'congestionado').length,
                muy_congestionado: predictions.filter(p => p.trafficLevel.level === 'muy_congestionado').length,
            }
        };

        res.success({
            datetime: targetDate.toISOString(),
            predictions,
            stats,
            errors: errors.length > 0 ? errors : undefined
        });

    } catch (error: any) {
        res.error(error.message, 500);
    }
}

export const getRoutes = async (req: Request, res: Response): Promise<void> => {
    try {
        const routes = AllRoutes;

        res.success({
            routes,
            total: routes.length
        });
    } catch (error: any) {
        res.error(error.message, 500);
    }
};