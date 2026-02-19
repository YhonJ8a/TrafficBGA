import { AppDataSource } from "../database/db";
import { Reportes } from "../entities/Reportes";
import { TipoReportes } from "../entities/TipoReportes";
import { LessThan, MoreThan, Between } from "typeorm";
import { io } from '../index';


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
        reporte.latitude = Number(Number(data.latitude).toFixed(5));
        reporte.longitude = Number(Number(data.longitude).toFixed(5));
        reporte.tipoReporte = tipoReporte;
        reporte.tipoReporte_id = data.tipoReporte_id;
        reporte.fechaReporte = new Date();
        reporte.horaReporte = new Date();

        const ahora = new Date();
        reporte.fechaExpiracion = new Date(ahora.getTime() + tipoReporte.duracionMinutos! * 60000);

        const reporteGuardado = await this.reportesRepository.save(reporte);

        const socketManager = (global as any).socketManager;
        if (socketManager) {
            await socketManager.notificarNuevoReporte(reporteGuardado);
        }

        return reporteGuardado;
    }

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

        console.log('query: ', query.getQuery());
        if (soloActivos) {
            const ahora = new Date();
            query.andWhere("reporte.fechaExpiracion > :ahora", { ahora })
                .andWhere("reporte.expirado = :expirado", { expirado: false });
        }

        const reportes = await query.getMany();

        return reportes.map(reporte => ({
            ...reporte,
            estaActivo: new Date() < new Date(reporte.fechaExpiracion!),
            tiempoRestanteMinutos: this.calcularTiempoRestante(reporte.fechaExpiracion!)
        }));
    }

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
                estaActivo: new Date() < new Date(reporte.fechaExpiracion!),
                tiempoRestanteMinutos: this.calcularTiempoRestante(reporte.fechaExpiracion!)
            };
        }).sort((a, b) => a.distanciaKm - b.distanciaKm); // Ordenar por distancia
    }

    async obtenerReportesCercanosARuta(
        puntos: Array<{ latitude: number; longitude: number }>,
        radioKm: number = 2,
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

    async marcarReportesExpirados(): Promise<string[]> {
        const ahora = new Date();

        const reportesExpirados = await this.reportesRepository.find({
            where: {
                fechaExpiracion: LessThan(ahora),
                expirado: false
            },
            select: ['id']
        });

        if (reportesExpirados.length > 0) {
            await this.reportesRepository.update(
                {
                    fechaExpiracion: LessThan(ahora),
                    expirado: false
                },
                { expirado: true, visible: false }
            );

            return reportesExpirados.map(r => r.id);
        }

        return [];
    }

    async obtenerTodosLosReportes() {
        const reportes = await this.reportesRepository.find({
            relations: ["tipoReporte"]
        });

        return reportes.map(reporte => ({
            ...reporte,
            estaActivo: new Date() < new Date(reporte.fechaExpiracion!),
            tiempoRestanteMinutos: this.calcularTiempoRestante(reporte.fechaExpiracion!)
        }));
    }

    async obtenerReportesConFiltros(filtros: {

        latitudMin?: number;
        latitudMax?: number;
        longitudMin?: number;
        longitudMax?: number;
        latitudCentro?: number;
        longitudCentro?: number;
        radioKm?: number;

        tiposReporte?: string[];

        fechaDesde?: Date;
        fechaHasta?: Date;

        soloActivos?: boolean;
        estados?: string[];

        orderBy?: 'fecha' | 'distancia' | 'expiracion';
        orderDirection?: 'ASC' | 'DESC';
    }) {
        const query = this.reportesRepository.createQueryBuilder("reporte")
            .leftJoinAndSelect("reporte.tipoReporte", "tipoReporte")
            .where("reporte.visible = :visible", { visible: true });

        if (filtros.latitudMin !== undefined && filtros.latitudMax !== undefined &&
            filtros.longitudMin !== undefined && filtros.longitudMax !== undefined) {
            query.andWhere("reporte.latitude BETWEEN :latMin AND :latMax", {
                latMin: filtros.latitudMin,
                latMax: filtros.latitudMax
            })
                .andWhere("reporte.longitude BETWEEN :lngMin AND :lngMax", {
                    lngMin: filtros.longitudMin,
                    lngMax: filtros.longitudMax
                });
        }

        if (filtros.latitudCentro !== undefined &&
            filtros.longitudCentro !== undefined &&
            filtros.radioKm !== undefined) {
            query.andWhere(
                `(6371 * acos(
          cos(radians(:lat)) * 
          cos(radians(reporte.latitude)) * 
          cos(radians(reporte.longitude) - radians(:lng)) + 
          sin(radians(:lat)) * 
          sin(radians(reporte.latitude))
        )) <= :radio`,
                {
                    lat: filtros.latitudCentro,
                    lng: filtros.longitudCentro,
                    radio: filtros.radioKm
                }
            );
        }

        if (filtros.tiposReporte && filtros.tiposReporte.length > 0) {
            query.andWhere("reporte.tipoReporte_id IN (:...tipos)", {
                tipos: filtros.tiposReporte
            });
        }

        if (filtros.fechaDesde && filtros.fechaHasta) {
            query.andWhere("reporte.fechaReporte BETWEEN :fechaDesde AND :fechaHasta", {
                fechaDesde: filtros.fechaDesde,
                fechaHasta: filtros.fechaHasta
            });
        } else if (filtros.fechaDesde) {
            query.andWhere("reporte.fechaReporte >= :fechaDesde", {
                fechaDesde: filtros.fechaDesde
            });
        } else if (filtros.fechaHasta) {
            query.andWhere("reporte.fechaReporte <= :fechaHasta", {
                fechaHasta: filtros.fechaHasta
            });
        }

        if (filtros.soloActivos !== false) {
            const ahora = new Date();
            query.andWhere("reporte.fechaExpiracion > :ahora", { ahora })
                .andWhere("reporte.expirado = :expirado", { expirado: false });
        }

        if (filtros.estados && filtros.estados.length > 0) {
            query.andWhere("reporte.estado IN (:...estados)", {
                estados: filtros.estados
            });
        }

        const orderDirection = filtros.orderDirection || 'DESC';

        switch (filtros.orderBy) {
            case 'fecha':
                query.orderBy("reporte.fechaReporte", orderDirection);
                break;
            case 'expiracion':
                query.orderBy("reporte.fechaExpiracion", orderDirection);
                break;
            case 'distancia':
                break;
            default:
                query.orderBy("reporte.fechaCreacion", orderDirection);
        }

        const reportes = await query.getMany();

        // Agregar información adicional y calcular distancia si es necesario
        let reportesConInfo = reportes.map(reporte => {
            const info: any = {
                ...reporte,
                estaActivo: new Date() < new Date(reporte.fechaExpiracion!),
                tiempoRestanteMinutos: this.calcularTiempoRestante(reporte.fechaExpiracion!)
            };

            // Calcular distancia si se proporcionó un centro
            if (filtros.latitudCentro !== undefined && filtros.longitudCentro !== undefined) {
                info.distanciaKm = this.calcularDistancia(
                    filtros.latitudCentro,
                    filtros.longitudCentro,
                    Number(reporte.latitude),
                    Number(reporte.longitude)
                );
            }

            return info;
        });

        // Ordenar por distancia si fue solicitado
        if (filtros.orderBy === 'distancia' && filtros.latitudCentro !== undefined) {
            reportesConInfo.sort((a, b) => {
                const distA = a.distanciaKm || Infinity;
                const distB = b.distanciaKm || Infinity;
                return filtros.orderDirection === 'ASC' ? distA - distB : distB - distA;
            });
        }

        return reportesConInfo;
    }

    // ⭐ NUEVO: Obtener reportes por tipo específico
    async obtenerReportesPorTipo(
        tipoReporteId: string,
        soloActivos: boolean = true
    ) {
        const query = this.reportesRepository.createQueryBuilder("reporte")
            .leftJoinAndSelect("reporte.tipoReporte", "tipoReporte")
            .where("reporte.tipoReporte_id = :tipoId", { tipoId: tipoReporteId })
            .andWhere("reporte.visible = :visible", { visible: true });

        if (soloActivos) {
            const ahora = new Date();
            query.andWhere("reporte.fechaExpiracion > :ahora", { ahora })
                .andWhere("reporte.expirado = :expirado", { expirado: false });
        }

        const reportes = await query.orderBy("reporte.fechaCreacion", "DESC").getMany();

        return reportes.map(reporte => ({
            ...reporte,
            estaActivo: new Date() < new Date(reporte.fechaExpiracion!),
            tiempoRestanteMinutos: this.calcularTiempoRestante(reporte.fechaExpiracion!)
        }));
    }

    // ⭐ NUEVO: Obtener reportes por rango de fechas
    async obtenerReportesPorRangoFechas(
        fechaDesde: Date,
        fechaHasta: Date,
        soloActivos: boolean = true
    ) {
        const query = this.reportesRepository.createQueryBuilder("reporte")
            .leftJoinAndSelect("reporte.tipoReporte", "tipoReporte")
            .where("reporte.fechaReporte BETWEEN :fechaDesde AND :fechaHasta", {
                fechaDesde,
                fechaHasta
            })
            .andWhere("reporte.visible = :visible", { visible: true });

        if (soloActivos) {
            const ahora = new Date();
            query.andWhere("reporte.fechaExpiracion > :ahora", { ahora })
                .andWhere("reporte.expirado = :expirado", { expirado: false });
        }

        const reportes = await query.orderBy("reporte.fechaReporte", "DESC").getMany();

        return reportes.map(reporte => ({
            ...reporte,
            estaActivo: new Date() < new Date(reporte.fechaExpiracion!),
            tiempoRestanteMinutos: this.calcularTiempoRestante(reporte.fechaExpiracion!)
        }));
    }

    // ⭐ NUEVO: Obtener estadísticas de reportes
    async obtenerEstadisticas(filtros?: {
        fechaDesde?: Date;
        fechaHasta?: Date;
    }) {
        const query = this.reportesRepository.createQueryBuilder("reporte")
            .leftJoin("reporte.tipoReporte", "tipoReporte")
            .select("tipoReporte.title", "tipoReporte")
            .addSelect("COUNT(reporte.id)", "cantidad")
            .addSelect("SUM(CASE WHEN reporte.expirado = false THEN 1 ELSE 0 END)", "activos")
            .addSelect("SUM(CASE WHEN reporte.estado = 'resuelto' THEN 1 ELSE 0 END)", "resueltos")
            .where("reporte.visible = :visible", { visible: true })
            .groupBy("tipoReporte.id");

        if (filtros?.fechaDesde && filtros?.fechaHasta) {
            query.andWhere("reporte.fechaReporte BETWEEN :fechaDesde AND :fechaHasta", {
                fechaDesde: filtros.fechaDesde,
                fechaHasta: filtros.fechaHasta
            });
        }

        const estadisticas = await query.getRawMany();

        const total = await this.reportesRepository.count({
            where: { visible: true }
        });

        return {
            total,
            porTipo: estadisticas
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

    private calcularTiempoRestante(fechaExpiracion: Date): number {
        const ahora = new Date();
        const diferencia = new Date(fechaExpiracion).getTime() - ahora.getTime();
        return Math.max(0, Math.floor(diferencia / 60000));
    }


}