import { Router } from "express";

import { allTypes, getType } from "../../controllers/TipoReporteController";


const router = Router()

router.get("/", allTypes);

router.get("/:id", getType);


export default router;