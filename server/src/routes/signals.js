// routes/signals.js
import express from "express";
import market from "../market/state.js";

const router = express.Router();

const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

// GET / → list signals, optional ?limit query (default 500)
router.get("/", (req, res, next) => {
  try {
    const rawLimit = parseInt(req.query.limit, 10);
    const limit = Number.isFinite(rawLimit)
      ? clamp(rawLimit, 1, 2000)
      : 500;

    const signals = market.listSignals(limit);

    return res.json({
      ok: true,
      signals
    });
  } catch (e) {
    next(e);
  }
});

// GET /snapshot → return current snapshot of market state
router.get("/snapshot", (req, res, next) => {
  try {
    return res.json({
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
    const signal = market.getSignal(key);

    if (!signal) {
      return res.status(404).json({
        ok: false,
        error: "not_found",
        key
      });
    }

    return res.json({
      ok: true,
      signal
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

    return res.json({
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
    const removed = await market.removeSignal(key, { emit: true });

    if (!removed) {
      return res.status(404).json({
        ok: false,
        error: "not_found",
        key
      });
    }

    return res.json({
      ok: true,
      removed: true,
      key
    });
  } catch (e) {
    next(e);
  }
});

export default router;