import { Router } from "express";

import Reportes from "../routes/reportes/Reportes.js";

const router = Router()

router.post('/reportes', Reportes);

export default router;