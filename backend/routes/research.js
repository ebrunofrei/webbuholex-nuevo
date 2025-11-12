// backend/routes/research.js
import express from "express";
import fetch from "node-fetch";

const router = express.Router();

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY || "";
const GOOGLE_CSE_ID  = process.env.GOOGLE_CSE_ID  || "";
const ENABLE_RESEARCH = String(process.env.ENABLE_RESEARCH || "").toLowerCase() === "true";

// ---------- /api/research/health
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

// ---------- /api/research/search?q=...&num=3
router.get("/search", async (req, res) => {
  try {
    if (!ENABLE_RESEARCH) {
      return res.status(403).json({ ok: false, error: "research_disabled" });
    }
    if (!GOOGLE_API_KEY || !GOOGLE_CSE_ID) {
      return res.status(500).json({ ok: false, error: "missing_keys" });
    }

    const q = String(req.query.q || "").trim();
    const numRaw = parseInt(String(req.query.num || "5"), 10);
    const num = Math.min(Math.max(numRaw || 5, 1), 10); // 1..10

    if (!q) {
      return res.status(400).json({ ok: false, error: "q_required" });
    }

    // Construimos URL segura
    const params = new URLSearchParams({
      key: GOOGLE_API_KEY,
      cx: GOOGLE_CSE_ID,
      q,
      num: String(num),
      lr: "lang_es",         // sesgo a español
      safe: "off",
      // fields para respuesta compacta (opcional):
      // fields: "searchInformation(totalResults),items(title,link,snippet,pagemap(cse_image,cse_thumbnail,metatags))",
    });

    const url = `https://www.googleapis.com/customsearch/v1?${params.toString()}`;

    const gx = await fetch(url, { method: "GET" });
    const ctype = gx.headers.get("content-type") || "";
    const isJson = ctype.includes("application/json");

    if (!gx.ok) {
      const raw = isJson ? await gx.json().catch(() => ({})) : await gx.text().catch(() => "");
      // Propagamos el error de Google tal cual para depurar
      return res.status(gx.status).json({ ok: false, error: raw || `google_http_${gx.status}` });
    }

    const data = await gx.json();
    // Normalizamos un poco
    const items = (data.items || []).map((it) => ({
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
        (new URL(it.link).hostname.replace(/^www\./, "")),
    }));

    return res.json({ ok: true, q, count: items.length, items });
  } catch (err) {
    console.error("[research/search] error:", err);
    return res.status(500).json({ ok: false, error: "internal_error" });
  }
});

export default router;
