import { Router } from "express";

import { allTrafficRoutes } from "../../controllers/TrafficController";


const router = Router()

router.get("/", allTrafficRoutes);

export default router;