import { Request, Response } from "express";
import { AppDataSource } from "../database/db.js";
import { Tipo } from "../entities/Tipo.js";

const typeRepository = AppDataSource.getRepository(Tipo);

export const allTypes = async (req: Request, res: Response): Promise<void> => {

    try {
        const typesRepor = await typeRepository.find();
        if (!typesRepor) {
            res.status(404).error("No se encontraron tipos");
            return;
        }
        res.success(typesRepor)

        return;
    } catch (error) {
        if (error instanceof Error) {
            console.log(error);
            res.status(500).error(error.message);
        }
        return;
    }
}

export const getType = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const typeRepor = await typeRepository.findOne({ where: { id: id } });

        res.success(typeRepor);
        return;
    } catch (error) {
        if (error instanceof Error) {
            res.status(500).error(error.message);
            return;
        }
    }
}