import express from "express";
import {
  calculatePositionSize,
  calculateRisk,
  calculateRiskReward
} from "../services/tools.service.js";

const router = express.Router();

router.post("/risk", (req, res, next) => {
  try {
    res.json({
      ok: true,
      result: calculateRisk(req.body || {})
    });
  } catch (error) {
    error.status = 400;
    error.code = "invalid_risk_payload";
    next(error);
  }
});

router.post("/position-size", (req, res, next) => {
  try {
    res.json({
      ok: true,
      result: calculatePositionSize(req.body || {})
    });
  } catch (error) {
    error.status = 400;
    error.code = "invalid_position_payload";
    next(error);
  }
});

router.post("/rr", (req, res, next) => {
  try {
    res.json({
      ok: true,
      result: calculateRiskReward(req.body || {})
    });
  } catch (error) {
    error.status = 400;
    error.code = "invalid_rr_payload";
    next(error);
  }
});

export default router;
