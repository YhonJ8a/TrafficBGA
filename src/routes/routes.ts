import { Router } from "express";

import Reportes from "./reportes/Reportes.js";
import TipoReporte from "./tipo/TipoReporte.js";
import puntosCriticos from "./puntosCriticos/PuntosCriticos.js"

const router = Router()

router.use('/reportes', Reportes);

router.use('/tipos', TipoReporte);

router.use('/puntosCriticos', puntosCriticos);

export default router;