// backend/routes/research.js
// ============================================================
// 🦉 BÚHOLEX | Búsqueda de jurisprudencia / doctrina (Google CSE)
// - GET /api/research/health
// - GET /api/research/search?q=...&num=3&lr=lang_es&start=1
// ============================================================

import express from "express";
import fetch from "node-fetch";

const router = express.Router();

const GOOGLE_API_KEY   = process.env.GOOGLE_API_KEY   || "";
const GOOGLE_CSE_ID    = process.env.GOOGLE_CSE_ID    || "";
const ENABLE_RESEARCH  = String(process.env.ENABLE_RESEARCH || "").toLowerCase() === "true";
const MAX_RESULTS_ENV  = parseInt(process.env.RESEARCH_MAX_RESULTS || "6", 10);

// 1..10 por limitación de Google, y además respetamos RESEARCH_MAX_RESULTS
const MAX_RESULTS = Math.min(Math.max(MAX_RESULTS_ENV || 6, 1), 10);

// Dominios permitidos (opcional): "pj.gob.pe,tc.gob.pe,elperuano.pe"
const ALLOWED_DOMAINS = (process.env.RESEARCH_ALLOWED_DOMAINS || "")
  .split(",")
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

// ---------- /api/research/health ----------
router.get("/health", (_req, res) => {
  if (!ENABLE_RESEARCH) {
    return res.status(200).json({ ok: true, msg: "ready (disabled by flag)" });
  }
  if (!GOOGLE_API_KEY || !GOOGLE_CSE_ID) {
    return res.status(500).json({
      ok: false,
      msg: "missing GOOGLE_API_KEY / GOOGLE_CSE_ID",
    });
  }
  return res.status(200).json({ ok: true, msg: "ready" });
});

// ---------- /api/research/search?q=...&num=3&lr=lang_es&start=1 ----------
router.get("/search", async (req, res) => {
  try {
    if (!ENABLE_RESEARCH) {
      return res.status(403).json({ ok: false, error: "research_disabled" });
    }
    if (!GOOGLE_API_KEY || !GOOGLE_CSE_ID) {
      return res.status(500).json({ ok: false, error: "missing_keys" });
    }

    const q = String(req.query.q || "").trim();
    if (!q) {
      return res.status(400).json({ ok: false, error: "q_required" });
    }

    // num: 1..MAX_RESULTS
    const numRaw = parseInt(String(req.query.num || "5"), 10);
    const num = Math.min(Math.max(numRaw || 5, 1), MAX_RESULTS);

    // lr: idioma (por defecto español)
    let lr = String(req.query.lr || "lang_es").trim();
    if (!lr) lr = "lang_es";

    // start: paginación CSE (1, 11, 21, ...)
    const startRaw = parseInt(String(req.query.start || "1"), 10);
    const start = Number.isFinite(startRaw) && startRaw > 0 ? startRaw : 1;

    // Construimos URL segura
    const params = new URLSearchParams({
      key: GOOGLE_API_KEY,
      cx: GOOGLE_CSE_ID,
      q,
      num: String(num),
      lr,
      safe: "off",
      start: String(start),
      // Si quieres respuesta compacta, puedes reactivar "fields"
      // fields: "searchInformation(totalResults),items(title,link,snippet,pagemap(cse_image,cse_thumbnail,metatags))",
    });

    const url = `https://www.googleapis.com/customsearch/v1?${params.toString()}`;

    const gx = await fetch(url, { method: "GET" });
    const ctype = gx.headers.get("content-type") || "";
    const isJson = ctype.includes("application/json");

    if (!gx.ok) {
      const raw = isJson ? await gx.json().catch(() => ({})) : await gx.text().catch(() => "");
      console.error("[research/search] Google error:", gx.status, raw);
      return res
        .status(gx.status)
        .json({ ok: false, error: raw || `google_http_${gx.status}` });
    }

    const data = await gx.json();

    let items = (data.items || []).map((it) => {
      let sourceHost = "";
      try {
        sourceHost = new URL(it.link).hostname.replace(/^www\./, "");
      } catch {
        sourceHost = "";
      }

      return {
        title: it.title,
        link: it.link,
        snippet: it.snippet,
        thumb:
          it.pagemap?.cse_thumbnail?.[0]?.src ||
          it.pagemap?.cse_image?.[0]?.src ||
          it.pagemap?.metatags?.[0]?.["og:image"] ||
          null,
        source:
          it.pagemap?.metatags?.[0]?.["og:site_name"] ||
          sourceHost,
        host: sourceHost,
      };
    });

    // Filtrado por dominios permitidos, si se configuran
    if (ALLOWED_DOMAINS.length > 0) {
      items = items.filter((it) => {
        const host = (it.host || "").toLowerCase();
        return ALLOWED_DOMAINS.some((d) => host.endsWith(d));
      });
    }

    return res.json({
      ok: true,
      q,
      num,
      lr,
      start,
      count: items.length,
      items,
    });
  } catch (err) {
    console.error("[research/search] error:", err);
    return res.status(500).json({ ok: false, error: "internal_error" });
  }
});

export default router;
