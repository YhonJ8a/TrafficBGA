import { Request, Response } from "express";
import { ReportesService } from "../services/ReportesService";

const reportesService = new ReportesService();

export const allReports = async (req: Request, res: Response): Promise<void> => {
    try {
        const reportes = await reportesService.obtenerTodosLosReportes();
        res.success(reportes);
    } catch (error: any) {
        res.error(error.message, 500);
    }
}

export const allActiveReports = async (req: Request, res: Response): Promise<void> => {
    try {
        const reportes = await reportesService.obtenerReportesActivos();
        res.success(reportes);
    } catch (error: any) {
        res.error(error.message, 500);
    }
}

export const getReportsArea = async (req: Request, res: Response): Promise<void> => {
    try {
        const { latMin, latMax, lngMin, lngMax, soloActivos } = req.query;
        if (!latMin || !latMax || !lngMin || !lngMax) {
            return res.error("Faltan parámetros: latMin, latMax, lngMin, lngMax", 400);
        }
        const reportes = await reportesService.obtenerReportesPorArea(
            Number(latMin),
            Number(latMax),
            Number(lngMin),
            Number(lngMax),
            soloActivos !== "false"
        );

        res.success(reportes);
    } catch (error: any) {
        res.error(error.message, 500);
    }
}

export const getReportsRadius = async (req: Request, res: Response): Promise<void> => {
    try {
        const { lat, lng, radio, soloActivos } = req.query;

        if (!lat || !lng || !radio) {
            return res.error("Faltan parámetros: lat, lng, radio (en km)", 400);
        }

        const reportes = await reportesService.obtenerReportesPorRadio(
            Number(lat),
            Number(lng),
            Number(radio),
            soloActivos !== "false"
        );

        res.success(reportes);
    } catch (error: any) {
        res.error(error.message, 500);
    }
}

export const createReport = async (req: Request, res: Response): Promise<void> => {
    try {
        const reporte = await reportesService.crearReporte(req.body);
        res.success(reporte, 201);
    } catch (error: any) {
        res.error(error.message, 400);
    }
}

export const getReportsRoute = async (req: Request, res: Response): Promise<void> => {
    try {
        const { puntos, radio, soloActivos } = req.body;

        if (!puntos || !Array.isArray(puntos)) {
            return res.error("Se requiere un array de puntos [{latitude, longitude}]", 400);
        }

        const reportes = await reportesService.obtenerReportesCercanosARuta(
            puntos,
            radio || 2,
            soloActivos !== false
        );

        res.success(reportes);
    } catch (error: any) {
        res.error(error.message, 500);
    }
}

export const searchReports = async (req: Request, res: Response): Promise<void> => {
    try {
        const filtros: any = {};

        // Filtros geográficos - área
        if (req.query.latMin) filtros.latitudMin = Number(req.query.latMin);
        if (req.query.latMax) filtros.latitudMax = Number(req.query.latMax);
        if (req.query.lngMin) filtros.longitudMin = Number(req.query.lngMin);
        if (req.query.lngMax) filtros.longitudMax = Number(req.query.lngMax);

        // Filtros geográficos - radio
        if (req.query.lat) filtros.latitudCentro = Number(req.query.lat);
        if (req.query.lng) filtros.longitudCentro = Number(req.query.lng);
        if (req.query.radio) filtros.radioKm = Number(req.query.radio);

        // Filtros por tipo
        if (req.query.tipos) {
            filtros.tiposReporte = Array.isArray(req.query.tipos)
                ? req.query.tipos
                : [req.query.tipos];
        }

        // Filtros por fecha
        if (req.query.fechaDesde) filtros.fechaDesde = new Date(req.query.fechaDesde as string);
        if (req.query.fechaHasta) filtros.fechaHasta = new Date(req.query.fechaHasta as string);

        // Filtros por estado
        if (req.query.soloActivos !== undefined) {
            filtros.soloActivos = req.query.soloActivos !== 'false';
        }
        if (req.query.estados) {
            filtros.estados = Array.isArray(req.query.estados)
                ? req.query.estados
                : [req.query.estados];
        }

        // Ordenamiento
        if (req.query.orderBy) filtros.orderBy = req.query.orderBy;
        if (req.query.orderDirection) filtros.orderDirection = req.query.orderDirection;

        const reportes = await reportesService.obtenerReportesConFiltros(filtros);
        res.success(reportes);
    } catch (error: any) {
        res.error(error.message, 500);
    }
}

export const getReportsByType = async (req: Request, res: Response): Promise<void> => {
    try {
        const { tipoId } = req.params;
        const soloActivos = req.query.soloActivos !== 'false';

        const reportes = await reportesService.obtenerReportesPorTipo(tipoId, soloActivos);
        res.success(reportes);
    } catch (error: any) {
        res.error(error.message, 500);
    }
}

export const getReportsByDateRange = async (req: Request, res: Response): Promise<void> => {
    try {
        const { fechaDesde, fechaHasta, soloActivos } = req.query;

        if (!fechaDesde || !fechaHasta) {
            return res.error("Se requieren fechaDesde y fechaHasta en formato ISO", 400);
        }

        const reportes = await reportesService.obtenerReportesPorRangoFechas(
            new Date(fechaDesde as string),
            new Date(fechaHasta as string),
            soloActivos !== 'false'
        );

        res.success(reportes);
    } catch (error: any) {
        res.error(error.message, 500);
    }
}

export const getReportsStatistics = async (req: Request, res: Response): Promise<void> => {
    try {
        const filtros: any = {};

        if (req.query.fechaDesde) {
            filtros.fechaDesde = new Date(req.query.fechaDesde as string);
        }
        if (req.query.fechaHasta) {
            filtros.fechaHasta = new Date(req.query.fechaHasta as string);
        }

        const estadisticas = await reportesService.obtenerEstadisticas(filtros);
        res.success(estadisticas);
    } catch (error: any) {
        res.error(error.message, 500);
    }
}