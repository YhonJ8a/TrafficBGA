import { AppDataSource } from "../database/db";
import { PuntosCriticos } from "../entities/PuntosCriticos";

export class PuntosCriticosService {
    private puntosCriticosRepository = AppDataSource.getRepository(PuntosCriticos);

    // Obtener todos los puntos críticos activos
    async obtenerPuntosCriticos(filtros?: {
        departamento?: string;
        municipio?: string;
        nivelPeligrosidad?: string[];
        visible?: boolean;
    }) {
        const where: any = { activo: true };

        if (filtros?.departamento) {
            where.departamento = filtros.departamento;
        }
        if (filtros?.municipio) {
            where.municipio = filtros.municipio;
        }
        if (filtros?.nivelPeligrosidad && filtros.nivelPeligrosidad.length > 0) {
            where.nivelPeligrosidad = filtros.nivelPeligrosidad;
        }
        if (filtros?.visible !== undefined) {
            where.visible = filtros.visible;
        }

        return await this.puntosCriticosRepository.find({
            where,
            order: { numeroAccidentes: "DESC" }
        });
    }

    // Obtener puntos críticos por área
    async obtenerPuntosPorArea(
        latitudMin: number,
        latitudMax: number,
        longitudMin: number,
        longitudMax: number
    ) {
        return await this.puntosCriticosRepository.createQueryBuilder("punto")
            .where("punto.latitude BETWEEN :latMin AND :latMax", {
                latMin: latitudMin,
                latMax: latitudMax
            })
            .andWhere("punto.longitude BETWEEN :lngMin AND :lngMax", {
                lngMin: longitudMin,
                lngMax: longitudMax
            })
            .andWhere("punto.activo = :activo", { activo: true })
            .andWhere("punto.visible = :visible", { visible: true })
            .orderBy("punto.numeroAccidentes", "DESC")
            .getMany();
    }

    // Obtener puntos críticos dentro de un radio
    async obtenerPuntosPorRadio(
        latitudCentro: number,
        longitudCentro: number,
        radioKm: number
    ) {
        const puntos = await this.puntosCriticosRepository.createQueryBuilder("punto")
            .where("punto.activo = :activo", { activo: true })
            .andWhere("punto.visible = :visible", { visible: true })
            .andWhere(
                `(6371 * acos(
          cos(radians(:lat)) * 
          cos(radians(punto.latitude)) * 
          cos(radians(punto.longitude) - radians(:lng)) + 
          sin(radians(:lat)) * 
          sin(radians(punto.latitude))
        )) <= :radio`,
                { lat: latitudCentro, lng: longitudCentro, radio: radioKm }
            )
            .getMany();

        return puntos.map(punto => {
            const distancia = this.calcularDistancia(
                latitudCentro,
                longitudCentro,
                Number(punto.latitude),
                Number(punto.longitude)
            );

            return {
                ...punto,
                distanciaKm: distancia
            };
        }).sort((a, b) => a.distanciaKm - b.distanciaKm);
    }

    // Obtener estadísticas
    async obtenerEstadisticas() {
        const total = await this.puntosCriticosRepository.count({ where: { activo: true } });

        const porNivel = await this.puntosCriticosRepository.createQueryBuilder("punto")
            .select("punto.nivelPeligrosidad", "nivel")
            .addSelect("COUNT(punto.id)", "cantidad")
            .addSelect("SUM(punto.numeroAccidentes)", "totalAccidentes")
            .addSelect("SUM(punto.muertos)", "totalMuertos")
            .addSelect("SUM(punto.heridos)", "totalHeridos")
            .where("punto.activo = :activo", { activo: true })
            .groupBy("punto.nivelPeligrosidad")
            .getRawMany();

        const porDepartamento = await this.puntosCriticosRepository.createQueryBuilder("punto")
            .select("punto.departamento", "departamento")
            .addSelect("COUNT(punto.id)", "cantidad")
            .where("punto.activo = :activo", { activo: true })
            .groupBy("punto.departamento")
            .orderBy("cantidad", "DESC")
            .limit(10)
            .getRawMany();

        return {
            total,
            porNivel,
            porDepartamento
        };
    }

    private calcularDistancia(
        lat1: number,
        lon1: number,
        lat2: number,
        lon2: number
    ): number {
        const R = 6371;
        const dLat = this.toRadians(lat2 - lat1);
        const dLon = this.toRadians(lon2 - lon1);

        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(this.toRadians(lat1)) *
            Math.cos(this.toRadians(lat2)) *
            Math.sin(dLon / 2) *
            Math.sin(dLon / 2);

        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distancia = R * c;

        return Math.round(distancia * 100) / 100;
    }

    private toRadians(grados: number): number {
        return grados * (Math.PI / 180);
    }
}