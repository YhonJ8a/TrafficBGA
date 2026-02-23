import { Router } from "express";

import Reportes from "./reportes/Reportes.js";
import TipoReporte from "./tipo/TipoReporte.js";
import puntosCriticos from "./puntosCriticos/PuntosCriticos.js"
import traffic from "./traffic/Traffic"
import prediction from "./prediction/Prediction"

const router = Router()

router.use('/reportes', Reportes);

router.use('/tipos', TipoReporte);

router.use('/puntosCriticos', puntosCriticos);

router.use('/traffic', traffic);

router.use('/prediction', prediction);


export default router;