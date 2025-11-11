// backend/routes/research.js
import express from "express";
import { researchSearch } from "../services/research/index.js";

const router = express.Router();

// health: muestra proveedor activo y dominios permitidos
router.get("/health", (req, res) => {
  const MAX = Number(process.env.RESEARCH_MAX_RESULTS || 6);
  const allowed = (process.env.RESEARCH_ALLOWED_DOMAINS || "")
    .split(",")
    .map(s => s.trim())
    .filter(Boolean);

  const provider =
    (process.env.GOOGLE_CSE_ID && process.env.GOOGLE_API_KEY && "googleCSE") ||
    (process.env.BING_API_KEY && "bing") ||
    (process.env.SERPAPI_KEY && "serpapi") ||
    null;

  res.json({
    enabled: Boolean(provider),
    provider,
    max: MAX,
    allowed,
  });
});

// search: /api/research/search?q=...&tipo=...
router.get("/search", async (req, res) => {
  try {
    const { q = "", tipo = "general" } = req.query;
    if (!q.trim()) {
      return res.status(400).json({
        ok: false,
        code: "RESEARCH_BAD_REQUEST",
        error: "Falta parámetro q",
      });
    }
    const results = await researchSearch({ q: q.trim(), tipo });
    return res.json({ ok: true, results });
  } catch (err) {
    console.error("research/search error:", err);
    return res.status(500).json({
      ok: false,
      code: "RESEARCH_ERROR",
      error: "Fallo interno en research",
    });
  }
});

export default router;
