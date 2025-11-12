// backend/routes/research.js
import express from "express";

const router = express.Router();

// GET /api/research/health
router.get("/health", (_req, res) => {
  const hasKey = !!process.env.GOOGLE_API_KEY;
  const hasCx  = !!process.env.GOOGLE_CSE_ID;
  res.json({
    ok: hasKey && hasCx,
    msg: hasKey && hasCx ? "ready" : "missing GOOGLE_API_KEY / GOOGLE_CSE_ID",
  });
});

// GET /api/research/search?q=...&num=3&start=1
router.get("/search", async (req, res) => {
  try {
    const qRaw = String(req.query.q || "").trim();
    if (!qRaw) return res.status(400).json({ ok: false, error: "q requerido" });

    const num  = Math.min(Math.max(parseInt(req.query.num || "5", 10) || 5, 1), 10);
    const start = Math.max(parseInt(req.query.start || "1", 10) || 1, 1);

    const key = process.env.GOOGLE_API_KEY;
    const cx  = process.env.GOOGLE_CSE_ID;
    if (!key || !cx) {
      return res.status(500).json({ ok: false, error: "missing GOOGLE_API_KEY / GOOGLE_CSE_ID" });
    }

    const params = new URLSearchParams({
      key, cx,
      q: qRaw,
      num: String(num),
      start: String(start),
      safe: "off",
      hl: "es",
      lr: "lang_es",
      gl: "pe"
    });

    const url = `https://customsearch.googleapis.com/customsearch/v1?${params.toString()}`;
    const r = await fetch(url, { headers: { Accept: "application/json" } });

    // Intenta parsear JSON siempre
    const data = await r.json().catch(() => ({}));

    if (!r.ok) {
      const message = data?.error?.message || JSON.stringify(data) || `HTTP ${r.status}`;
      return res.status(r.status).json({ ok: false, error: message });
    }

    // Mapea a un formato limpio
    const items = (data.items || []).map((it) => ({
      title: it.title,
      snippet: it.snippet,
      link: it.link,
      image:
        it.pagemap?.cse_image?.[0]?.src ||
        it.pagemap?.cse_thumbnail?.[0]?.src ||
        null,
      site: new URL(it.link).hostname
    }));

    res.json({
      ok: true,
      q: qRaw,
      count: items.length,
      items,
      meta: {
        searchTime: data.searchInformation?.searchTime,
        totalResults: data.searchInformation?.totalResults
      }
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message || "internal error" });
  }
});

export default router;
