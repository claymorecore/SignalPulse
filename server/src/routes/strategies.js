// routes/strategies.js
import express from "express";
import strategies from "../scanner/strategies/index.js";

const router = express.Router();

// GET / → list all available scanner strategies
router.get("/", async (req, res, next) => {
  try {
    res.json({
      ok: true,
      strategies: strategies.listStrategies()
    });
  } catch (e) {
    next(e);
  }
});

export default router;