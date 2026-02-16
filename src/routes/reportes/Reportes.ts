import { Router } from "express";

import {
    allReports,
    allActiveReports,
    getReportsArea,
    createReport,
    getReportsRadius,
    getReportsRoute,
    searchReports,
    getReportsByType,
    getReportsByDateRange,
    getReportsStatistics
} from "../../controllers/ResporteController";


const router = Router()

router.get("/", allReports);

router.get("/active", allActiveReports);

router.get("/area", getReportsArea);

router.get("/radius/:lat/:lng/:radio/:soloActivos", getReportsRadius);

router.post("/route", getReportsRoute);

router.post("/", createReport);

router.post("/search", searchReports);

router.get("/type/:tipoId/:soloActivos", getReportsByType);

router.get("/date-range/:fechaDesde/:fechaHasta/:soloActivos", getReportsByDateRange);

router.get("/statistics/:fechaDesde/:fechaHasta", getReportsStatistics);

export default router;