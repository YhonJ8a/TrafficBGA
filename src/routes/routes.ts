import { Router } from "express";

import Reportes from "./reportes/Reportes.js";
import TipoReporte from "./tipo/TipoReporte.js";

const router = Router()

router.use('/reportes', Reportes);

router.use('/tipos', TipoReporte);

export default router;