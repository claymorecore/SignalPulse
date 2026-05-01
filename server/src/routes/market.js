// routes/market.js
import { Router } from "express";
import market from "../market/state.js";

const router = Router();

// GET /state → returns current snapshot of the market/signals state
router.get("/state", (req, res, next) => {
  try {
    const snapshot = market.snapshot();

    return res.json({
      ok: true,
      ...snapshot
    });
  } catch (e) {
    next(e);
  }
});

export default router;