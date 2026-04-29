// routes/status.js
import express from "express";
import status from "../market/status.js"; // your health/status module

const router = express.Router();

// Full health/status endpoint
router.get("/", (req, res) => {
  res.json({
    ok: true,
    ...status.health() // spreads the runtime health info
  });
});

// Simple "alive" check for monitoring
router.get("/live", (req, res) => {
  res.json({
    ok: true,
    alive: true,
    ts: Date.now()
  });
});

export default router;