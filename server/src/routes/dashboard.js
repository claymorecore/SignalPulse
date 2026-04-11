import express from "express";
import * as dashboardService from "../services/dashboard.service.js";

const router = express.Router();

router.get("/summary", (req, res, next) => {
  try {
    res.json({
      ok: true,
      summary: dashboardService.getDashboardSummary()
    });
  } catch (error) {
    next(error);
  }
});

router.get("/metrics", (req, res, next) => {
  try {
    res.json({
      ok: true,
      metrics: dashboardService.getDashboardMetrics()
    });
  } catch (error) {
    next(error);
  }
});

export default router;
