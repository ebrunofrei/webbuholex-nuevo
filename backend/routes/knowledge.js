import express from "express";
import LegalKnowledge from "../models/LegalKnowledge.js";
import { normalizeText } from "../utils/normalize.js";

const router = express.Router();

/**
 * GET /api/knowledge/search
 * Búsqueda semántica ligera sobre knowledge base
 */
router.get("/search", async (req, res) => {
  try {
    const rawQuery = String(req.query.q || "").trim();

    // ⛔ Protección básica
    if (!rawQuery || rawQuery.length < 2) {
      return res.status(400).json({
        ok: false,
        error: "query_too_short",
      });
    }

    // 🔎 Normalización segura
    const normalized = normalizeText(rawQuery);

    // 🧱 Regex defensivo (escape mínimo)
    const safeRegex = normalized.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    const items = await LegalKnowledge.find(
      {
        $or: [
          { normalizedQuery: { $regex: safeRegex, $options: "i" } },
          { title: { $regex: rawQuery, $options: "i" } },
          { snippet: { $regex: rawQuery, $options: "i" } },
        ],
      },
      {
        title: 1,
        snippet: 1,
        url: 1,
        host: 1,
        sourceType: 1,
        trustScore: 1,
      }
    )
      .sort({ trustScore: -1 })
      .limit(10)
      .lean();

    return res.json({
      ok: true,
      query: rawQuery,
      count: items.length,
      items,
    });
  } catch (err) {
    console.error("❌ Knowledge search error:", err);
    return res.status(500).json({
      ok: false,
      error: "internal_error",
    });
  }
});

export default router;
