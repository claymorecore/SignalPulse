// routes/strategies.js
import express from "express";
import strategies from "../scanner/strategies/index.js";

const router = express.Router();

/**
 * GET /
 * Returns list of available strategies
 */
router.get("/", (req, res, next) => {
  try {
    const list = strategies.listStrategies();

    res.json({
      ok: true,
      strategies: list
    });
  } catch (e) {
    next(e);
  }
});

/**
 * GET /:name
 * Returns info about a specific strategy
 */
router.get("/:name", (req, res, next) => {
  try {
    const name = String(req.params.name || "").trim().toUpperCase();

    const strategy = strategies.getStrategy(name);

    if (!strategy) {
      res.status(404).json({
        ok: false,
        error: "not_found",
        message: `Strategy '${name}' not found`
      });
      return;
    }

    res.json({
      ok: true,
      strategy: name,
      hasBuilder: typeof strategy.buildEmaAtrSignal === "function"
    });
  } catch (e) {
    next(e);
  }
});

export default router;