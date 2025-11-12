// backend/routes/research.js
import express from "express";

const router = express.Router();

const API_KEY = process.env.GOOGLE_API_KEY || "";
const CSE_ID  = process.env.GOOGLE_CSE_ID  || "";
const ENABLE  = String(process.env.ENABLE_RESEARCH || "").toLowerCase() === "true";

// Health simple
router.get("/health", (_req, res) => {
  if (!ENABLE) return res.json({ ok: true, msg: "disabled" });
  const ok = Boolean(API_KEY && CSE_ID);
  return res.status(ok ? 200 : 500).json({
    ok,
    msg: ok ? "ready" : "missing GOOGLE_API_KEY/GOOGLE_CSE_ID",
  });
});

// /api/research/search?q=...&num=3&lang=es&country=pe
router.get("/search", async (req, res) => {
  try {
    if (!ENABLE) return res.status(403).json({ ok: false, error: "research disabled" });
    if (!API_KEY || !CSE_ID) {
      return res.status(500).json({ ok: false, error: "missing GOOGLE_API_KEY/GOOGLE_CSE_ID" });
    }

    const q = String(req.query.q || "").trim();
    if (q.length < 2) {
      return res.status(400).json({ ok: false, error: "param q too short" });
    }

    const num  = Math.max(1, Math.min(10, parseInt(req.query.num || "5", 10)));
    const lang = String(req.query.lang || process.env.NEWS_DEFAULT_LANG || "es");
    const gl   = String(req.query.country || process.env.NEWS_DEFAULT_COUNTRY || "pe");

    // Opcionales útiles: lr=lang_es, safe=off, searchType
    const params = new URLSearchParams({
      key: API_KEY,
      cx: CSE_ID,
      q,
      num: String(num),
      safe: "off",
    });

    // Afinar idioma/país
    if (lang) params.set("lr", `lang_${lang}`);
    if (gl)   params.set("gl", gl);

    const url = `https://www.googleapis.com/customsearch/v1?${params.toString()}`;
    const resp = await fetch(url, { method: "GET" });

    // Si Google responde 4xx/5xx, no devuelvas 400 ciego: propaga el status y mensaje
    if (!resp.ok) {
      const txt = await resp.text().catch(() => "");
      return res.status(resp.status).json({ ok: false, error: txt || resp.statusText });
    }

    const data = await resp.json();

    // Normalización mínima
    const items = (data.items || []).map((it) => ({
      title: it.title,
      link: it.link,
      snippet: it.snippet,
      displayLink: it.displayLink,
      mime: it.mime,
      img: it.pagemap?.cse_image?.[0]?.src || it.pagemap?.thumbnail?.[0]?.src || null,
    }));

    return res.json({ ok: true, count: items.length, items });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err?.message || "internal error" });
  }
});

export default router;
