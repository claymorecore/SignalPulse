// routes/scanner.js
import express from "express";
import market from "../market/state.js";       // Market signal state
import scannerState from "../scanner/state.js"; // Scanner runtime state
import { log } from "../middleware/log.js";     // Logging utility
import { validateScannerStartPayload } from "./scanner.validation.js";
import signalTelegramSync from "../services/telegram/signalTelegramSync.js";

const router = express.Router();

// POST /start → starts the scanner with optional config
router.post("/start", async (req, res, next) => {
  try {
    log.info("SCANNER_START_REQ", { cfg: req.body || {} });

    const errors = validateScannerStartPayload(req.body);
    if (errors.length) {
      res.status(400).json({
        ok: false,
        error: "invalid_scanner_config",
        message: "Scanner start payload is invalid",
        details: errors
      });
      return;
    }

    // Ensure any existing scanner run is stopped
    try {
      await scannerState.stop({ reason: "restart" });
    } catch {}

    // Clear market signals and start a fresh session
    await market.clearSignals({ clearDb: true, emit: true });
    await signalTelegramSync.purgeQueue();

    const r = await scannerState.start(req.body || {});

    res.json({
      ok: true,
      status: "started",
      session: market.S.session,
      cfg: r?.cfg || scannerState.S.cfg || null,
      result: r || null
    });
  } catch (e) {
    next(e);
  }
});

// POST /stop → stops the scanner
router.post("/stop", async (req, res, next) => {
  try {
    log.info("SCANNER_STOP_REQ", {});

    const result = await scannerState.stop({ reason: "manual" });

    res.json({
      ok: true,
      status: "stopped",
      result
    });
  } catch (e) {
    next(e);
  }
});

// POST /reset → resets scanner and market state
router.post("/reset", async (req, res, next) => {
  try {
    log.info("SCANNER_RESET_REQ", {});

    const stopResult = await scannerState.stop({ reason: "reset" });
    await market.clearSignals({ clearDb: true, emit: true });
    await signalTelegramSync.purgeQueue();

    res.json({
      ok: true,
      status: "reset",
      session: market.S.session,
      signals: 0,
      result: stopResult
    });
  } catch (e) {
    next(e);
  }
});

// GET /status → returns scanner + market current status
router.get("/status", async (req, res, next) => {
  try {
    const st =
      typeof scannerState.status === "function"
        ? scannerState.status()
        : {
            running: false,
            startedAt: 0,
            cfg: null
          };

    res.json({
      ok: true,
      running: !!st.running,
      startedAt: st.startedAt || 0,
      cfg: st.cfg || null,
      session: market.S.session,
      status: market.S.status
    });
  } catch (e) {
    next(e);
  }
});

export default router;
