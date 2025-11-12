// backend/routes/research.js
import express from "express";

const router = express.Router();

// Health simple
router.get("/health", (_req, res) => {
  const ok = !!process.env.GOOGLE_API_KEY && !!process.env.GOOGLE_CSE_ID;
  res.status(ok ? 200 : 500).json({
    ok,
    msg: ok ? "ready" : "missing GOOGLE_API_KEY / GOOGLE_CSE_ID",
  });
});

// /api/research/search?q=...&num=5&start=1
router.get("/search", async (req, res) => {
  try {
    const { q, num = 5, start = 1 } = req.query;
    if (!q) return res.status(400).json({ ok: false, error: "q requerido" });

    const key = process.env.GOOGLE_API_KEY;
    const cx  = process.env.GOOGLE_CSE_ID;
    if (!key || !cx) {
      return res.status(500).json({ ok: false, error: "Faltan GOOGLE_API_KEY/GOOGLE_CSE_ID" });
    }

    const url = new URL("https://www.googleapis.com/customsearch/v1");
    url.searchParams.set("key", key);
    url.searchParams.set("cx", cx);
    url.searchParams.set("q", q);
    url.searchParams.set("num", String(num));
    url.searchParams.set("start", String(start));

    const r = await fetch(url.toString());
    const data = await r.json();
    return res.status(r.ok ? 200 : r.status).json({ ok: r.ok, ...data });
  } catch (e) {
    res.status(500).json({ ok: false, error: "search_failed", message: e.message });
  }
});

export default router;
