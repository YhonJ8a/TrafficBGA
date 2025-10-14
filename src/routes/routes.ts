import { Router } from "express";

import Reportes from "../routes/reportes/Reportes.js";

const router = Router()

router.get("/", (req, res) => {
    res.json({ message: "Servidor backend en Vercel funcionando 🚀 y muestra la api" });
});

router.post('/reportes', Reportes);

export default router;