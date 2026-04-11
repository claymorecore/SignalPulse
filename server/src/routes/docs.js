import express from "express";
import { getDocsContent, listDocsContent } from "../services/content.service.js";

const router = express.Router();

router.get("/", (req, res, next) => {
  try {
    const items = listDocsContent();
    res.json({
      ok: true,
      items,
      total: items.length
    });
  } catch (error) {
    next(error);
  }
});

router.get("/:slug", (req, res, next) => {
  try {
    const item = getDocsContent(String(req.params.slug || ""));

    if (!item) {
      res.status(404).json({
        ok: false,
        error: "not_found",
        message: "Docs article not found"
      });
      return;
    }

    res.json({
      ok: true,
      item
    });
  } catch (error) {
    next(error);
  }
});

export default router;
