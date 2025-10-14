import { Request, Response } from "express";
import { AppDataSource } from "../database/db.js";
import { Reporte } from "../entities/Reporte.js";

export const allReportes = async (req: Request, res: Response): Promise<void> => {
    try {
        const users = await AppDataSource.getRepository(Reporte)
            .find({ relations: ['tipo'] });

        users.length ?
            res.json(users) :
            res.status(200).json({ message: "No se encontraron usuarios" });

        return;
    } catch (error) {
        if (error instanceof Error) {
            console.log(error);
            res.status(500).json({ message: error.message });
        }
        return;
    }
}

export const getReporte = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const user = await AppDataSource.getRepository(Reporte)
            .findOne({ where: { id: id }, relations: ['tipo'] });

        res.json(user);
        return;
    } catch (error) {
        if (error instanceof Error) {
            res.status(500).json({ message: error.message });
            return;
        }
    }
}