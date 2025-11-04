// backend/routes/media.js
import { Router } from "express";
import fetch from "node-fetch";
import path from "path";
import { fileURLToPath } from "url";

const router = Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Fallback oficial del proyecto (en /public)
const FALLBACK_ABS = path.join(process.cwd(), "public", "assets", "img", "noticia_fallback.png");

function setCacheHeaders(res) {
  res.setHeader("Cache-Control", "public, max-age=86400, stale-while-revalidate=604800");
}

/* ===================== /api/media/proxy?url=... ===================== */
router.get("/proxy", async (req, res) => {
  try {
    const url = String(req.query.url || "");
    if (!/^https?:\/\//i.test(url)) return res.status(400).end();

    const upstream = await fetch(url, {
      redirect: "follow",
      timeout: 12000,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; BuholexBot/1.0)",
        Referer: "https://buholex.com",
        Accept: "image/*",
      },
    });

    if (!upstream.ok) {
      return res.sendFile(FALLBACK_ABS);
    }

    const type = upstream.headers.get("content-type") || "image/jpeg";
    setCacheHeaders(res);
    res.setHeader("Content-Type", type);
    upstream.body.pipe(res);
  } catch (e) {
    res.sendFile(FALLBACK_ABS);
  }
});

/* ===================== /api/media/og?url=... ===================== */
/* Extrae og:image / twitter:image del HTML y devuelve la imagen */
router.get("/og", async (req, res) => {
  try {
    const pageUrl = String(req.query.url || "");
    if (!/^https?:\/\//i.test(pageUrl)) return res.status(400).end();

    const resp = await fetch(pageUrl, { redirect: "follow", timeout: 9000, headers: { "User-Agent": "Mozilla/5.0" }});
    const html = await resp.text();

    // Buscar meta tags de imagen
    const pick =
      html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)?.[1] ||
      html.match(/<meta[^>]+name=["']og:image["'][^>]+content=["']([^"']+)["']/i)?.[1] ||
      html.match(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i)?.[1] ||
      html.match(/<meta[^>]+property=["']twitter:image["'][^>]+content=["']([^"']+)["']/i)?.[1] ||
      html.match(/<meta[^>]+itemprop=["']image["'][^>]+content=["']([^"']+)["']/i)?.[1] ||
      html.match(/<link[^>]+rel=["']image_src["'][^>]+href=["']([^"']+)["']/i)?.[1];

    if (!pick) {
      return res.status(404).send("no_og");
    }

    // Absolutizar contra la URL de la página
    const abs = new URL(pick, pageUrl).href;

    // Stream de la imagen OG
    const img = await fetch(abs, {
      redirect: "follow",
      timeout: 12000,
      headers: { "User-Agent": "Mozilla/5.0", Accept: "image/*" },
    });

    if (!img.ok) return res.sendFile(FALLBACK_ABS);

    const type = img.headers.get("content-type") || "image/*";
    setCacheHeaders(res);
    res.setHeader("Content-Type", type);
    img.body.pipe(res);
  } catch {
    res.sendFile(FALLBACK_ABS);
  }
});

/* ===================== /api/media/favicon?url=... ===================== */
router.get("/favicon", async (req, res) => {
  try {
    const pageUrl = String(req.query.url || "");
    if (!/^https?:\/\//i.test(pageUrl)) return res.status(400).end();

    const origin = new URL(pageUrl).origin;
    const favUrl = `${origin}/favicon.ico`;

    const fav = await fetch(favUrl, { redirect: "follow", timeout: 9000, headers: { Accept: "image/*" }});
    if (!fav.ok) return res.sendFile(FALLBACK_ABS);

    const type = fav.headers.get("content-type") || "image/x-icon";
    setCacheHeaders(res);
    res.setHeader("Content-Type", type);
    fav.body.pipe(res);
  } catch {
    res.sendFile(FALLBACK_ABS);
  }
});

export default router;
