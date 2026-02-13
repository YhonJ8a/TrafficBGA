import { AppDataSource } from "../database/db";
import { Reportes } from "../entities/Reportes";
import { TipoReportes } from "../entities/TipoReportes";
import { LessThan, MoreThan, Between } from "typeorm";

export class ReportesService {
    private reportesRepository = AppDataSource.getRepository(Reportes);
    private tipoReportesRepository = AppDataSource.getRepository(TipoReportes);

    async crearReporte(data: {
        title: string;
        description: string;
        latitude: number;
        longitude: number;
        tipoReporte_id: string;
    }) {
        const tipoReporte = await this.tipoReportesRepository.findOne({
            where: { id: data.tipoReporte_id }
        });

        if (!tipoReporte) {
            throw new Error("Tipo de reporte no encontrado");
        }

        const reporte = new Reportes();
        reporte.title = data.title;
        reporte.description = data.description;
        reporte.latitude = data.latitude;
        reporte.longitude = data.longitude;
        reporte.tipoReporte = tipoReporte;
        reporte.tipoReporte_id = data.tipoReporte_id;
        reporte.fechaReporte = new Date();
        reporte.horaReporte = new Date();

        const ahora = new Date();
        reporte.fechaExpiracion = new Date(ahora.getTime() + tipoReporte.duracionMinutos! * 60000);

        return await this.reportesRepository.save(reporte);
    }

    // Obtener reportes activos (no expirados)
    async obtenerReportesActivos() {
        const ahora = new Date();
        return await this.reportesRepository.find({
            where: {
                fechaExpiracion: MoreThan(ahora),
                visible: true,
                expirado: false
            },
            relations: ["tipoReporte"]
        });
    }

    // ⭐ NUEVO: Obtener reportes por área (bounding box)
    async obtenerReportesPorArea(
        latitudMin: number,
        latitudMax: number,
        longitudMin: number,
        longitudMax: number,
        soloActivos: boolean = true
    ) {
        const query = this.reportesRepository.createQueryBuilder("reporte")
            .leftJoinAndSelect("reporte.tipoReporte", "tipoReporte")
            .where("reporte.latitude BETWEEN :latMin AND :latMax", {
                latMin: latitudMin,
                latMax: latitudMax
            })
            .andWhere("reporte.longitude BETWEEN :lngMin AND :lngMax", {
                lngMin: longitudMin,
                lngMax: longitudMax
            })
            .andWhere("reporte.visible = :visible", { visible: true });

        if (soloActivos) {
            const ahora = new Date();
            query.andWhere("reporte.fechaExpiracion > :ahora", { ahora })
                .andWhere("reporte.expirado = :expirado", { expirado: false });
        }

        const reportes = await query.getMany();

        return reportes.map(reporte => ({
            ...reporte,
            estaActivo: new Date() < new Date(reporte.fechaExpiracion),
            tiempoRestanteMinutos: this.calcularTiempoRestante(reporte.fechaExpiracion)
        }));
    }

    // ⭐ NUEVO: Obtener reportes dentro de un radio (en kilómetros)
    async obtenerReportesPorRadio(
        latitudCentro: number,
        longitudCentro: number,
        radioKm: number,
        soloActivos: boolean = true
    ) {
        // Fórmula Haversine para calcular distancia
        const query = this.reportesRepository.createQueryBuilder("reporte")
            .leftJoinAndSelect("reporte.tipoReporte", "tipoReporte")
            .where("reporte.visible = :visible", { visible: true })
            .andWhere(
                `(6371 * acos(
          cos(radians(:lat)) * 
          cos(radians(reporte.latitude)) * 
          cos(radians(reporte.longitude) - radians(:lng)) + 
          sin(radians(:lat)) * 
          sin(radians(reporte.latitude))
        )) <= :radio`,
                { lat: latitudCentro, lng: longitudCentro, radio: radioKm }
            );

        if (soloActivos) {
            const ahora = new Date();
            query.andWhere("reporte.fechaExpiracion > :ahora", { ahora })
                .andWhere("reporte.expirado = :expirado", { expirado: false });
        }

        const reportes = await query.getMany();

        return reportes.map(reporte => {
            const distancia = this.calcularDistancia(
                latitudCentro,
                longitudCentro,
                Number(reporte.latitude),
                Number(reporte.longitude)
            );

            return {
                ...reporte,
                distanciaKm: distancia,
                estaActivo: new Date() < new Date(reporte.fechaExpiracion),
                tiempoRestanteMinutos: this.calcularTiempoRestante(reporte.fechaExpiracion)
            };
        }).sort((a, b) => a.distanciaKm - b.distanciaKm); // Ordenar por distancia
    }

    // ⭐ NUEVO: Obtener reportes cercanos a una ruta
    async obtenerReportesCercanosARuta(
        puntos: Array<{ latitude: number; longitude: number }>,
        radioKm: number = 2, // Radio de 2km por defecto alrededor de cada punto
        soloActivos: boolean = true
    ) {
        const reportesCercanos = new Map();

        for (const punto of puntos) {
            const reportes = await this.obtenerReportesPorRadio(
                punto.latitude,
                punto.longitude,
                radioKm,
                soloActivos
            );

            reportes.forEach(reporte => {
                if (!reportesCercanos.has(reporte.id)) {
                    reportesCercanos.set(reporte.id, reporte);
                }
            });
        }

        return Array.from(reportesCercanos.values());
    }

    // Marcar reportes expirados
    async marcarReportesExpirados() {
        const ahora = new Date();
        await this.reportesRepository.update(
            {
                fechaExpiracion: LessThan(ahora),
                expirado: false
            },
            { expirado: true, visible: false }
        );
    }

    // Obtener todos los reportes con información de expiración
    async obtenerTodosLosReportes() {
        const reportes = await this.reportesRepository.find({
            relations: ["tipoReporte"]
        });

        return reportes.map(reporte => ({
            ...reporte,
            estaActivo: new Date() < new Date(reporte.fechaExpiracion),
            tiempoRestanteMinutos: this.calcularTiempoRestante(reporte.fechaExpiracion)
        }));
    }

    // ⭐ Calcular distancia usando fórmula Haversine
    private calcularDistancia(
        lat1: number,
        lon1: number,
        lat2: number,
        lon2: number
    ): number {
        const R = 6371; // Radio de la Tierra en km
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

        return Math.round(distancia * 100) / 100; // Redondear a 2 decimales
    }

    private toRadians(grados: number): number {
        return grados * (Math.PI / 180);
    }

    // Calcular tiempo restante en minutos
    private calcularTiempoRestante(fechaExpiracion: Date): number {
        const ahora = new Date();
        const diferencia = new Date(fechaExpiracion).getTime() - ahora.getTime();
        return Math.max(0, Math.floor(diferencia / 60000));
    }
}