import { Request, Response } from "express";
import { PuntosCriticosService } from "../services/PuntosCriticosService";


const puntosCriticosService = new PuntosCriticosService();

export const getReportsAll = async (req: Request, res: Response): Promise<void> => {
    try {
        const { departamento, municipio, nivelPeligrosidad, visible } = req.query;

        const filtros: any = {};
        if (departamento) filtros.departamento = departamento;
        if (municipio) filtros.municipio = municipio;
        if (visible !== undefined) filtros.visible = visible === 'true';

        if (nivelPeligrosidad) {
            filtros.nivelPeligrosidad = Array.isArray(nivelPeligrosidad)
                ? nivelPeligrosidad
                : [nivelPeligrosidad];
        }

        const puntos = await puntosCriticosService.obtenerPuntosCriticos(filtros);
        res.success(puntos);
    } catch (error: any) {
        res.error(error.message, 500);
    }
}


export const getReportsArea = async (req: Request, res: Response): Promise<void> => {
    try {
        const { latMin, latMax, lngMin, lngMax } = req.query;

        if (!latMin || !latMax || !lngMin || !lngMax) {
            return res.error("Faltan parámetros: latMin, latMax, lngMin, lngMax", 400);
        }

        const puntos = await puntosCriticosService.obtenerPuntosPorArea(
            Number(latMin),
            Number(latMax),
            Number(lngMin),
            Number(lngMax)
        );

        res.success(puntos);
    } catch (error: any) {
        res.error(error.message, 500);
    }
}

export const getReportsRadio = async (req: Request, res: Response): Promise<void> => {
    try {
        const { lat, lng, radio } = req.query;

        if (!lat || !lng || !radio) {
            return res.error("Faltan parámetros: lat, lng, radio (en km)", 400);
        }

        const puntos = await puntosCriticosService.obtenerPuntosPorRadio(
            Number(lat),
            Number(lng),
            Number(radio)
        );

        res.success(puntos);
    } catch (error: any) {
        res.error(error.message, 500);
    }
}
export const getReportsEstadisticas = async (req: Request, res: Response): Promise<void> => {
    try {
        const estadisticas = await puntosCriticosService.obtenerEstadisticas();
        res.success(estadisticas);
    } catch (error: any) {
        res.error(error.message, 500);
    }
}
