// routes/signals.js
import express from "express";
import market from "../market/state.js";
import signalEngineService from "../services/signal-engine.service.js";

const router = express.Router();

// GET / → list signals, optional ?limit query (default 500)
router.get("/", (req, res, next) => {
  try {
    const limit = Math.max(1, parseInt(req.query.limit, 10) || 500);
    const items = signalEngineService.listSignals({ limit });

    res.json({
      ok: true,
      signals: items
    });
  } catch (e) {
    next(e);
  }
});

router.get("/active", (req, res, next) => {
  try {
    const limit = Math.max(1, parseInt(req.query.limit, 10) || 200);
    res.json({
      ok: true,
      signals: signalEngineService.getActiveSignals({ limit })
    });
  } catch (e) {
    next(e);
  }
});

router.get("/history", (req, res, next) => {
  try {
    const limit = Math.max(1, parseInt(req.query.limit, 10) || 200);
    res.json({
      ok: true,
      signals: signalEngineService.getSignalHistory({ limit })
    });
  } catch (e) {
    next(e);
  }
});

router.get("/engine/summary", (req, res, next) => {
  try {
    res.json({
      ok: true,
      summary: signalEngineService.getEngineSummary()
    });
  } catch (e) {
    next(e);
  }
});

router.post("/scan", async (req, res, next) => {
  try {
    const result = await signalEngineService.scanSignals(req.body || {});
    res.json({
      ok: true,
      result
    });
  } catch (e) {
    next(e);
  }
});

router.post("/replay", async (req, res, next) => {
  try {
    const result = await signalEngineService.replaySignals(req.body || {});
    res.json({
      ok: true,
      result
    });
  } catch (e) {
    next(e);
  }
});

// GET /snapshot → return current snapshot of market state
router.get("/snapshot", (req, res, next) => {
  try {
    res.json({
      ok: true,
      snapshot: market.snapshot()
    });
  } catch (e) {
    next(e);
  }
});

// GET /:key → get a single signal by its key
router.get("/:key", (req, res, next) => {
  try {
    const key = String(req.params.key || "");
    const sig = signalEngineService.getSignalById(key) || market.getSignal(key);

    if (!sig) {
      res.status(404).json({
        ok: false,
        error: "not_found",
        key
      });
      return;
    }

    res.json({
      ok: true,
      signal: sig
    });
  } catch (e) {
    next(e);
  }
});

// DELETE / → clear all signals (emits and clears DB)
router.delete("/", async (req, res, next) => {
  try {
    await market.clearSignals({
      emit: true,
      clearDb: true
    });

    res.json({
      ok: true,
      cleared: true
    });
  } catch (e) {
    next(e);
  }
});

// DELETE /:key → remove a single signal by key
router.delete("/:key", async (req, res, next) => {
  try {
    const key = String(req.params.key || "");
    const ok = await market.removeSignal(key, { emit: true });

    if (!ok) {
      res.status(404).json({
        ok: false,
        error: "not_found",
        key
      });
      return;
    }

    res.json({
      ok: true,
      removed: true,
      key
    });
  } catch (e) {
    next(e);
  }
});

export default router;
