import { Router } from "express";

import { allReportes, getReporte } from "../../controllers/ResporteController.js";


const router = Router()

router.get("/", allReportes);

router.get("/:id", getReporte);

// router.post("/", createUser);

// router.put("/:id", updateUser);

// router.get("/pedidos/:id", getUserPedidos);

// router.get("/ventas/:id", getUserVentas);

export default router;