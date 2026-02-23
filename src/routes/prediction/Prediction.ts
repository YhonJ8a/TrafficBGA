import { Router } from "express";

import { checkMLService, trainModel, predict, predictNextHours, predictAllRoutes, getRoutes } from "../../controllers/PredictionController";


const router = Router()

router.get("/is_active", checkMLService);

router.get("/routes", getRoutes);

router.post("/train", trainModel);

router.post("/predict", predict);

router.post("/predict_next_hours", predictNextHours);

router.post("/all-routes", predictAllRoutes);

export default router;