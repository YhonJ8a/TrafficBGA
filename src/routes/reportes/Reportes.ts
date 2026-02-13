import { Router } from "express";

import { allReportes, createResidente, getReporte } from "../../controllers/ResporteController";


const router = Router()

router.get("/", allReportes);

router.get("/:id", getReporte);

router.post("/", createResidente);

export default router;