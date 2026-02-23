import { Request, Response } from "express";
import { AppDataSource } from "../database/db.js";
import { TrafficRouteData } from "../entities/TrafficRouteData.js";

const trafficRepository = AppDataSource.getRepository(TrafficRouteData);

export const allTrafficRoutes = async (req: Request, res: Response): Promise<void> => {

    try {
        const typesRepor = await trafficRepository.find();
        if (!typesRepor) {
            res.status(404).error("No se encontraron rutas");
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