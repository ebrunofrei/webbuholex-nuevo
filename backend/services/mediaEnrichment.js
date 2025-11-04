// backend/services/mediaEnrichment.js
import { request } from "undici";
import * as cheerio from "cheerio";

/** Devuelve URL absoluta a partir de base */
function absolutize(maybeUrl, base) {
  if (!maybeUrl) return "";
  try {
    if (/^(data:|blob:)/i.test(maybeUrl)) return maybeUrl;
    return new URL(maybeUrl, base).href;
  } catch {
    return "";
  }
}

/** Extrae og:image | twitter:image | itemprop | link[image_src] */
export async function getOgImage(pageUrl) {
  if (!pageUrl || !/^https?:\/\//i.test(pageUrl)) return "";
  try {
    const r = await request(pageUrl, { maxRedirections: 2, headers: { "User-Agent":"Mozilla/5.0" }});
    const html = await r.body.text();
    const $ = cheerio.load(html);
    const pick =
      $('meta[property="og:image"]').attr("content") ||
      $('meta[name="og:image"]').attr("content") ||
      $('meta[name="twitter:image"]').attr("content") ||
      $('meta[property="twitter:image"]').attr("content") ||
      $('meta[itemprop="image"]').attr("content") ||
      $('link[rel="image_src"]').attr("href") ||
      "";
    return absolutize(pick, pageUrl);
  } catch {
    return "";
  }
}

/** Favicon del origen de la página */
export function getFaviconFrom(pageUrl) {
  try { return new URL("/favicon.ico", pageUrl).href; } catch { return ""; }
}

/** Coalesce final para una noticia */
export async function resolveImageForItem(n) {
  const enlace = n?.enlace || n?.url || n?.link || "";
  const first =
    n?.imagen || n?.image || n?.imageUrl || n?.urlToImage ||
    n?.thumbnail || n?.thumbnailUrl ||
    (Array.isArray(n?.multimedia) && n.multimedia[0]?.url) ||
    (Array.isArray(n?.media) && (n.media[0]?.url || n.media[0]?.src)) ||
    (Array.isArray(n?.images) && n.images[0]?.url) || "";

  // 1) si ya viene una imagen, absolutizar contra el enlace
  if (first) {
    const abs = absolutize(first, enlace);
    if (abs) return abs;
  }

  // 2) intentar og:image
  if (enlace) {
    const og = await getOgImage(enlace);
    if (og) return og;
    // 3) fallback favicon
    const fav = getFaviconFrom(enlace);
    if (fav) return fav;
  }

  return ""; // el front usará el fallback local
}
