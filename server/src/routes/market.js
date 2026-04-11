import express from "express";
import * as marketService from "../services/market.service.js";

const router = express.Router();

router.get("/state", (req, res, next) => {
  try {
    const snapshot = marketService.getSnapshot();
    res.json({
      ok: true,
      ...snapshot
    });
  } catch (error) {
    next(error);
  }
});

router.get("/overview", (req, res, next) => {
  try {
    res.json({
      ok: true,
      overview: marketService.getMarketOverview()
    });
  } catch (error) {
    next(error);
  }
});

router.get("/structure", (req, res, next) => {
  try {
    res.json({
      ok: true,
      structure: marketService.getMarketStructure()
    });
  } catch (error) {
    next(error);
  }
});

router.get("/assets", (req, res, next) => {
  try {
    const limit = Math.max(1, Math.min(50, Number.parseInt(req.query.limit, 10) || 12));
    const assets = marketService.getTrackedAssets(limit);

    res.json({
      ok: true,
      assets,
      total: assets.length
    });
  } catch (error) {
    next(error);
  }
});

export default router;
