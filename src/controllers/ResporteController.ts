import { Request, Response } from "express";
import { AppDataSource } from "../database/db.js";
import { Reporte } from "../entities/Reporte.js";
import { Tipo } from "../entities/Tipo.js";

const reporteRepository = AppDataSource.getRepository(Reporte);
const tipoRepository = AppDataSource.getRepository(Tipo);

export const allReportes = async (req: Request, res: Response): Promise<void> => {
    try {
        const users = await reporteRepository
            .find({ relations: ['iconName'] });

        users.length ?
            res.success(users) :
            res.status(201).success({ message: "No se encontraron reportes" });

        return;
    } catch (error) {
        if (error instanceof Error) {
            console.log(error);
            res.status(500).error(error.message);
        }
        return;
    }
}

export const getReporte = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const user = await reporteRepository
            .findOne({ where: { id: id }, relations: ['iconName'] });

        user ?
            res.success(user) :
            res.error("No se encontro el reporte");
        return;
    } catch (error) {
        if (error instanceof Error) {
            res.status(500).error(error.message);
            return;
        }
    }
}

export const createResidente = async (req: Request, res: Response): Promise<void> => {
    try {
        const { title, ubicacion, snippet, size, latitude, longitude, idTipo } = req.body;

        const tipo_id = await tipoRepository.findOne({ where: { id: idTipo } });
        console.log("tipo", tipo_id)
        if (!tipo_id) {
            res.status(404).error("Tipo de reporte no encontrado");
            return;
        }

        const newResidente = {
            title,
            ubicacion,
            snippet,
            size,
            latitude,
            longitude,
            fechaCreacion: new Date(),
            tipo_id
        };
        console.log(newResidente)

        const savedResidente = await reporteRepository.save(newResidente);
        savedResidente ?
            res.status(200).success(savedResidente) :
            res.error("No se pudo guardar el reporte");

    } catch (error) {
        if (error instanceof Error) {
            res.status(500).error(error.message);
        }
    }
}

