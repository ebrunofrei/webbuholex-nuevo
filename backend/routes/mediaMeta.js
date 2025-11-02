// backend/routes/mediaMeta.js
import { Router } from "express";
import fetch from "node-fetch";

const r = Router();

// GET /api/media/meta?url=...
r.get("/meta", async (req, res) => {
  try {
    const url = String(req.query.url || "");
    if (!/^https?:\/\//i.test(url)) return res.json({ ok: true, ogImage: "" });

    const resp = await fetch(url, { redirect: "follow", timeout: 9000 });
    const html = await resp.text();

    // Buscar og:image / twitter:image
    const m =
      html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) ||
      html.match(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i) ||
      html.match(/<meta[^>]+itemprop=["']image["'][^>]+content=["']([^"']+)["']/i);

    const ogImage = m ? m[1] : "";
    return res.json({ ok: true, ogImage });
  } catch (e) {
    return res.json({ ok: true, ogImage: "" });
  }
});

// GET /api/media/proxy?url=...
r.get("/proxy", async (req, res) => {
  try {
    const url = String(req.query.url || "");
    if (!/^https?:\/\//i.test(url)) return res.status(400).end();

    const upstream = await fetch(url, { redirect: "follow", timeout: 12000 });
    const type = upstream.headers.get("content-type") || "application/octet-stream";
    res.setHeader("Content-Type", type);
    upstream.body.pipe(res);
  } catch {
    res.status(502).end();
  }
});

export default r;
