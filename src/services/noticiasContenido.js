// ============================================================
// 🦉 BúhoLex | Extracción de contenido de noticia (frontend)
// - Sin dependencias circulares (usa _newsCore.js)
// ============================================================

import {
  API_BASE,
  FETCH_TIMEOUT_MS,
  fetchJSON,
} from "./_newsCore.js"; // ← relativo, sin alias

const CONTENT_URL = `${API_BASE}/noticias/contenido`;
const ALT_ENDPOINTS = [
  `${API_BASE}/news/content`,
  `${API_BASE}/contenido`,
];
const MAX_GET_QS = 1800;

/**
 * getContenidoNoticia(urlOrOpts)
 *  - getContenidoNoticia("https://...") | getContenidoNoticia({ url|enlace|link, lang?, full?, mode?, signal?, timeout? })
 * Devuelve: { titulo, html, plain, imagen, videos, fuente, fecha, canonicalUrl }
 */
export async function getContenidoNoticia(urlOrOpts) {
  const arg = typeof urlOrOpts === "string" ? { url: urlOrOpts } : (urlOrOpts || {});
  const {
    url: rawUrl,
    enlace,
    link,
    lang = "es",
    full = 1,
    mode = "lite",
    signal,
    timeout = FETCH_TIMEOUT_MS,
  } = arg;

  const url = rawUrl || enlace || link || "";
  if (!url) return fallbackPayload();

  const qsObj = { url, enlace: url, lang, full: full ? 1 : 0, mode };
  const qs = new URLSearchParams(Object.entries(qsObj).map(([k, v]) => [k, String(v)])).toString();

  const endpoints = [CONTENT_URL, ...ALT_ENDPOINTS];
  let lastErr = null;

  for (const base of endpoints) {
    const attempts = [];
    if (qs.length <= MAX_GET_QS) attempts.push(() => fetchJSON(`${base}?${qs}`, { signal, timeout }));
    attempts.push(() => fetchJSON(base, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(qsObj),
      signal,
      timeout,
    }));

    for (const run of attempts) {
      try {
        const j = await run();
        const payload = normalizeContentResponse(j, url);
        if (payload.titulo || payload.html || payload.plain) return payload;
      } catch (e) { lastErr = e; }
    }
  }

  console.warn("[ContenidoNoticia] fallback payload:", lastErr?.message || lastErr);
  return fallbackPayload(url);
}

/* ----------------- helpers ----------------- */
function normalizeContentResponse(j = {}, requestUrl = "") {
  const titulo = pickFirst(j.titulo, j.title, j.headline, j.seoTitle, "Sin título");
  const bodyHtmlRaw = pickFirst(j.bodyHtml, j.html, j.contentHtml, j.articleHtml, j.documentHtml, j.fullHtml, j.raw);
  const bodyTextRaw = pickFirst(j.body, j.text, j.content, j.article, j.plain, j.description, j.summary, "");

  const html = str(bodyHtmlRaw) ? sanitizeHtml(bodyHtmlRaw)
            : str(bodyTextRaw) ? toHtml(bodyTextRaw)
            : "<p>Sin contenido.</p>";

  const imagen = pickFirst(
    j.imagen, j.image, j.cover, j.ogImage,
    Array.isArray(j.imagenes) && j.imagenes[0],
    Array.isArray(j.images) && j.images[0]
  ) || firstImgFromHtml(html);

  let videos = Array.isArray(j.videos) ? j.videos : [];
  if (!videos.length && html) {
    const yt    = [...html.matchAll(/<iframe[^>]+src=["']([^"']+youtube[^"']+)["']/gi)].map(m => m[1]);
    const vimeo = [...html.matchAll(/<iframe[^>]+src=["']([^"']+vimeo[^"']+)["']/gi)].map(m => m[1]);
    videos = [...yt, ...vimeo];
  }

  const fuente = pickFirst(j.fuente, j.source, j.medio, "");
  const f = j.fecha || j.publishedAt || j.date || null;
  const fecha = f ? new Date(f).toISOString() : null;

  return { titulo, html, plain: orStr(j.plain || j.text || "", ""), imagen, videos, fuente, fecha,
           canonicalUrl: j.canonicalUrl || j.url || requestUrl };
}

function firstImgFromHtml(html = "") {
  const m = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  return m ? m[1] : "";
}
function toHtml(text = "") {
  const parts = String(text).split(/\n{2,}/g).map(p => p.trim()).filter(Boolean).map(p => p.replace(/\n/g, " "));
  return parts.length ? `<p>${parts.join("</p><p>")}</p>` : "<p></p>";
}
function sanitizeHtml(html = "") {
  try { const tmp = document.createElement("div");
        tmp.innerHTML = html; tmp.querySelectorAll("script,style,noscript").forEach(el => el.remove());
        return tmp.innerHTML.trim() || "<p></p>"; } catch { return "<p></p>"; }
}
const str = (v) => typeof v === "string" && v.trim().length > 0;
function orStr(v, def = "") { return str(v) ? v : def; }
function pickFirst(...vals) { return vals.find((v) => str(v)) || ""; }
function fallbackPayload(requestUrl = "") {
  return { titulo: "Sin título", html: "<p>Sin contenido.</p>", plain: "", imagen: "", videos: [],
           fuente: "", fecha: null, canonicalUrl: requestUrl || undefined };
}
