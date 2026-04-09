// routes/state.js
import { Router } from "express";
import market from "../market/state.js"; // your state management module

const router = Router();

// GET /state → returns current snapshot of the market/signals state
router.get("/state", (req, res) => {
  const snap = market.snapshot();

  res.json({
    ok: true,
    ...snap
  });
});

export default router;