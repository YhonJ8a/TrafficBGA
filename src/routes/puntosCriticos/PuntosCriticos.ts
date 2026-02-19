import { Router } from "express";
import { getReportsAll, getReportsArea, getReportsRadio, getReportsEstadisticas } from "../../controllers/PuntosCriticosController";

const router = Router();

router.get("/",getReportsAll);

router.get("/area", getReportsArea);

router.get("/radio", getReportsRadio);

router.get("/estadisticas", getReportsEstadisticas);

export default router;