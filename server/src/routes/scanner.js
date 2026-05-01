// routes/scanner.js
import express from "express";
import market from "../market/state.js";
import scannerState from "../scanner/state.js";
import { log } from "../middleware/log.js";
import { validateScannerStartPayload } from "./scanner.validation.js";
import signalTelegramSync from "../services/telegram/signalTelegramSync.js";

const router = express.Router();

/* -------------------- Helpers -------------------- */
const safePurgeTelegram = async () => {
  try {
    await signalTelegramSync.purgeQueue();
  } catch (e) {
    log.warn("TELEGRAM_PURGE_FAIL", {
      err: e?.message || String(e)
    });
  }
};

/* -------------------- Routes -------------------- */

// POST /start
router.post("/start", async (req, res, next) => {
  try {
    log.info("SCANNER_START_REQ", { cfg: req.body || {} });

    const errors = validateScannerStartPayload(req.body);
    if (errors.length) {
      return res.status(400).json({
        ok: false,
        error: "invalid_scanner_config",
        message: "Scanner start payload is invalid",
        details: errors
      });
    }

    // Stop existing run
    try {
      await scannerState.stop({ reason: "restart" });
    } catch {}

    // Reset state
    await market.clearSignals({ clearDb: true, emit: true });
    await safePurgeTelegram();

    // Start scanner
    const result = await scannerState.start(req.body || {});

    return res.json({
      ok: true,
      status: "started",
      session: market.S.session,
      cfg: result?.cfg || null,
      result
    });

  } catch (e) {
    next(e);
  }
});

// POST /stop
router.post("/stop", async (req, res, next) => {
  try {
    log.info("SCANNER_STOP_REQ", {});

    const result = await scannerState.stop({ reason: "manual" });

    return res.json({
      ok: true,
      status: "stopped",
      result
    });

  } catch (e) {
    next(e);
  }
});

// POST /reset
router.post("/reset", async (req, res, next) => {
  try {
    log.info("SCANNER_RESET_REQ", {});

    const result = await scannerState.stop({ reason: "reset" });

    await market.clearSignals({ clearDb: true, emit: true });
    await safePurgeTelegram();

    return res.json({
      ok: true,
      status: "reset",
      session: market.S.session,
      signals: 0,
      result
    });

  } catch (e) {
    next(e);
  }
});

// GET /status
router.get("/status", async (req, res, next) => {
  try {
    const st = scannerState.status();

    return res.json({
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