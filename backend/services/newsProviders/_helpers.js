// backend/services/newsProviders/_helpers.js

/* =========================
 * Texto / Normalización
 * ========================= */
export const stripHtml = (html = "") =>
  String(html || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

export const normalizeText = (s = "") =>
  String(s || "").replace(/\s+/g, " ").replace(/\u00A0/g, " ").trim();

/* =========================
 * URL helpers
 * ========================= */
function ensureHttps(u = "") {
  try {
    if (!u) return "";
    const url = new URL(u, "https://");
    if (!/^https?:$/i.test(url.protocol)) url.protocol = "https:";
    return url.toString();
  } catch {
    return String(u || "");
  }
}

export function absUrl(href = "", base = "") {
  try {
    if (!href) return "";
    return new URL(href, base || "https://").toString();
  } catch {
    // si falla, al menos asegura https
    return ensureHttps(href);
  }
}

/**
 * En backend, si no tienes proxy de imágenes, déjalo passthrough.
 * Si implementas /api/media?url=..., adapta aquí.
 */
export function proxifyMedia(u = "") {
  return String(u || "");
}

/* =========================
 * Fechas / Idioma
 * ========================= */
export function toISODate(d) {
  try {
    if (!d) return null;
    const s = String(d).trim();

    // ISO directo
    const parsed = Date.parse(s);
    if (!Number.isNaN(parsed)) return new Date(parsed).toISOString();

    // dd/mm/yyyy o dd-mm-yyyy
    const m = s.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
    if (m) {
      const [, dd, mm, yy] = m;
      const year = Number(yy) < 100 ? 2000 + Number(yy) : Number(yy);
      const dt = new Date(year, Number(mm) - 1, Number(dd));
      if (!Number.isNaN(dt.getTime())) return dt.toISOString();
    }
    return null;
  } catch {
    return null;
  }
}

export function guessLang(text = "") {
  const T = (text || "").toLowerCase();
  if (!T.trim()) return "es";
  const es =
    (T.match(/[áéíóúñ¡¿]| el | la | de | que | los | las | para | con | del /g) || []).length;
  const en = (T.match(/ the | of | and | to | in | is | for | on | with | by /g) || []).length;
  if (!es && !en) return "es";
  return es >= en ? "es" : "en";
}

/* =========================
 * HTTP helper (HTML)
 * ========================= */
export async function fetchHTML(urlOrList, { timeoutMs = 12000 } = {}) {
  const urls = Array.isArray(urlOrList) ? urlOrList : [urlOrList];
  let lastErr = null;

  for (const url of urls) {
    try {
      const ctrl = new AbortController();
      const id = setTimeout(() => ctrl.abort(new Error("timeout")), timeoutMs);

      const res = await fetch(url, {
        signal: ctrl.signal,
        headers: {
          "user-agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome Safari",
          accept: "text/html,application/xhtml+xml",
        },
      });

      clearTimeout(id);

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const html = await res.text();
      if (html && html.length > 100) return html; // heurística mínima válida
    } catch (e) {
      lastErr = e;
      // intentar siguiente candidato
    }
  }
  if (lastErr) throw lastErr;
  return "";
}

/* =========================
 * Normalización principal
 * ========================= */
function hostFromUrl(u = "") {
  try {
    const h = new URL(u).hostname;
    return h.replace(/^www\./i, "");
  } catch {
    return "";
  }
}

export function normalizeItem(n = {}) {
  const titulo = (n.titulo ?? n.title ?? "").toString().trim();

  // Resumen preferentemente en texto plano
  const resumenRaw = n.resumen ?? n.description ?? n.summary ?? n.abstract ?? "";
  const resumen = /<\/?[a-z][\s\S]*>/i.test(resumenRaw)
    ? stripHtml(resumenRaw)
    : String(resumenRaw || "");

  const url = ensureHttps(n.url ?? n.link ?? n.enlace ?? "");
  const imagen = ensureHttps(n.imagen ?? n.image ?? n.thumbnail ?? n.cover ?? "");
  const fuente = (n.fuente ?? n.source ?? hostFromUrl(url) ?? "").toString().trim();
  const fecha = toISODate(n.fecha ?? n.pubDate ?? n.date ?? n.publishedAt ?? null);

  // idioma: respeta el declarado; si no hay, infiere
  const lang = ((n.lang ?? guessLang(`${titulo} ${resumen}`)) || "es").toLowerCase();

  // id estable
  const id =
    n.id ??
    n._id ??
    n.guid ??
    url ??
    `${fuente}-${titulo}`.slice(0, 96);

  const video = Boolean(n.video || n.videoUrl || (n.media && /video/i.test(n.media)));

  return {
    id,
    titulo,
    resumen,
    url,
    imagen,
    fuente,
    fecha, // ISO o null
    lang,  // 'es' | 'en' | ...
    video,
  };
}

/* =========================
 * Filtros de colección
 * ========================= */
export function filterByTopics(items = [], topics = []) {
  if (!topics || !topics.length) return items;
  const bag = topics.map((s) => s.toLowerCase());
  return items.filter((n) => {
    const t = `${n.titulo || ""} ${n.resumen || ""}`.toLowerCase();
    return bag.some((k) => t.includes(k));
  });
}

export function filterByLang(items = [], lang = "es") {
  if (!lang || lang === "all") return items;
  return items.filter((n) => (n.lang || "es") === lang);
}

/**
 * Artículo “completo”: mínimo de texto o HTML significativo
 */
export function isCompleteEnough(plain = "", html = "") {
  const txt = String(plain || "").trim();
  const len = txt.length;
  const para = (txt.match(/\.\s|\n/g) || []).length;
  const htmlLen = stripHtml(html || "").length;
  return (len >= 700 && para >= 3) || htmlLen >= 900;
}

/**
 * Quitar duplicados por URL o por (fuente+titulo)
 */
export function dedupe(items = []) {
  const seenUrl = new Set();
  const seenFT = new Set();
  const out = [];
  for (const n of items) {
    const k1 = (n.url || "").toLowerCase();
    const k2 = `${(n.fuente || "").toLowerCase()}|${(n.titulo || "").toLowerCase()}`;
    if (k1 && seenUrl.has(k1)) continue;
    if (!k1 && seenFT.has(k2)) continue;
    if (k1) seenUrl.add(k1);
    else seenFT.add(k2);
    out.push(n);
  }
  return out;
}
