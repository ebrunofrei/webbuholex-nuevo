// ============================================================
// 🦉 BúhoLex | News Providers · Helpers (refactor)
// - Texto/HTML: stripHtml, normalizeText
// - URL: ensureHttps, absUrl, proxifyMedia
// - Fechas/Idioma: toISODate, smartDate, guessLang
// - HTTP: fetchHTML (retries), fetchRSS (tolerante)
// - Normalizador: normalizeItem
// - Filtros: filterByTopics, filterByLang, isCompleteEnough, dedupe
// - Aliases: isCompleteBySummary (compat)
// ============================================================

/* =========================
 * Texto / Normalización
 * ========================= */
const decodeEntities = (s = "") =>
  String(s)
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&quot;/gi, '"');

export const stripHtml = (html = "") =>
  decodeEntities(String(html || "")).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

export const normalizeText = (s = "") =>
  decodeEntities(String(s || "")).replace(/\u00A0/g, " ").replace(/\s+/g, " ").trim();

/* =========================
 * URL helpers
 * ========================= */

// Exportada (otros módulos pueden necesitarla)
export function ensureHttps(u = "") {
  const raw = String(u || "").trim();
  if (!raw) return "";

  // protocolo relativo: //host/path
  if (/^\/\//.test(raw)) return `https:${raw}`;

  // ya es absoluta http/https
  if (/^https?:\/\//i.test(raw)) return raw;

  // si parece host/path sin protocolo
  if (/^[\w.-]+\.[a-z]{2,}(\/|$)/i.test(raw)) return `https://${raw}`;

  // dejar tal cual (podría ser relativo)
  return raw;
}

// Absolutiza root-relative y relativas con respecto a "base"
// Soporta arrays de posibles "base" y protocolo-relativo
export function absUrl(href = "", base = "") {
  const h = String(href || "").trim();
  if (!h) return "";

  // absoluta/protocolo-relativo
  if (/^(https?:)?\/\//i.test(h)) return ensureHttps(h);

  const bases = Array.isArray(base) ? base : [base || "https://"];
  for (const b of bases) {
    try {
      const url = new URL(h, ensureHttps(b));
      return url.toString();
    } catch {
      /* siguiente base */
    }
  }
  return ensureHttps(h);
}

/**
 * Proxificar imagen/media si defines variables de entorno:
 *   MEDIA_PROXY=1 y MEDIA_PROXY_BASE (p.ej. "https://api.buholex.com/media/proxy")
 * Caso contrario, passthrough.
 */
const MEDIA_PROXY_ON = String(process.env.MEDIA_PROXY || "0") === "1";
const MEDIA_PROXY_BASE = (process.env.MEDIA_PROXY_BASE || "").replace(/\/+$/, "");
export function proxifyMedia(u = "") {
  const url = ensureHttps(u);
  if (!url) return "";
  if (!MEDIA_PROXY_ON || !MEDIA_PROXY_BASE) return url;
  try {
    const h = new URL(url).hostname;
    const apiH = new URL(MEDIA_PROXY_BASE).hostname;
    if (h === apiH) return url; // ya está proxificada
  } catch { /* ignore */ }
  const sep = MEDIA_PROXY_BASE.includes("?") ? "&" : "?";
  return `${MEDIA_PROXY_BASE}${sep}url=${encodeURIComponent(url)}`;
}

/* =========================
 * Fechas / Idioma
 * ========================= */

const MONTHS_ES = {
  enero: 0, ene: 0,
  febrero: 1, feb: 1,
  marzo: 2, mar: 2,
  abril: 3, abr: 3,
  mayo: 4, may: 4,
  junio: 5, jun: 5,
  julio: 6, jul: 6,
  agosto: 7, ago: 7,
  septiembre: 8, set: 8, sep: 8,
  octubre: 9, oct: 9,
  noviembre: 10, nov: 10,
  diciembre: 11, dic: 11,
};

const MONTHS_EN = {
  january: 0, jan: 0,
  february: 1, feb: 1,
  march: 2, mar: 2,
  april: 3, apr: 3,
  may: 4,
  june: 5, jun: 5,
  july: 6, jul: 6,
  august: 7, aug: 7,
  september: 8, sep: 8,
  october: 9, oct: 9,
  november: 10, nov: 10,
  december: 11, dec: 11,
};

// Intenta parsear ISO, dd/mm/yyyy, dd-mm-yyyy, "12 de octubre de 2025", "Oct 12, 2025", "2025-10-12 14:05 -0500"
export function toISODate(d) {
  try {
    if (!d) return null;
    const s = String(d).trim();

    // ISO/RFC/timestamp
    const parsed = Date.parse(s);
    if (!Number.isNaN(parsed)) return new Date(parsed).toISOString();

    // dd/mm/yyyy o dd-mm-yyyy
    let m = s.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?(?:\s*([+-]\d{2}:?\d{2}))?)?/);
    if (m) {
      const [, dd, mm, yy, hh = "0", mi = "0", ss = "0"] = m;
      const year = Number(yy) < 100 ? 2000 + Number(yy) : Number(yy);
      const dt = new Date(Date.UTC(year, Number(mm) - 1, Number(dd), Number(hh), Number(mi), Number(ss)));
      if (!Number.isNaN(dt.getTime())) return dt.toISOString();
    }

    // "12 de octubre de 2025", "12 oct 2025"
    m = s.toLowerCase().match(/(\d{1,2})\s*(de)?\s*([a-záéíóúüñ\.]+)\s*(de)?\s*(\d{4})/i);
    if (m) {
      const [, ddStr, , monthStrRaw, , yyyyStr] = m;
      const dd = Number(ddStr);
      const monthStr = monthStrRaw.replace(/\./g, "");
      const yyyy = Number(yyyyStr);
      const mm = MONTHS_ES[monthStr];
      if (mm != null) {
        const dt = new Date(Date.UTC(yyyy, mm, dd));
        if (!Number.isNaN(dt.getTime())) return dt.toISOString();
      }
    }

    // "Oct 12, 2025"
    m = s.toLowerCase().match(/([a-z\.]+)\s+(\d{1,2}),?\s+(\d{4})/i);
    if (m) {
      const [, monRaw, ddStr, yyyyStr] = m;
      const mon = monRaw.replace(/\./g, "");
      const mm = MONTHS_EN[mon];
      if (mm != null) {
        const dt = new Date(Date.UTC(Number(yyyyStr), mm, Number(ddStr)));
        if (!Number.isNaN(dt.getTime())) return dt.toISOString();
      }
    }

    return null;
  } catch {
    return null;
  }
}

// Parser tolerante: intenta ISO; si no, pasa por toISODate; si aún no, ahora()
export function smartDate(raw) {
  const iso =
    toISODate(raw) ||
    (Number.isFinite(+raw) ? new Date(+raw).toISOString() : null);
  return iso || new Date().toISOString();
}

// Heurística barata para idioma (es/en/pt)
export function guessLang(text = "") {
  const T = (text || "").toLowerCase();
  if (!T.trim()) return "es";
  const es = (T.match(/[áéíóúñ¡¿]| el | la | de | que | los | las | para | con | del /g) || []).length;
  const en = (T.match(/ the | of | and | to | in | is | for | on | with | by /g) || []).length;
  const pt = (T.match(/ de | e | para | com | que | os | as | não | nao | por /g) || []).length;
  if (es >= en && es >= pt) return "es";
  if (pt > en) return "pt";
  return "en";
}

/* =========================
 * HTTP helpers
 * ========================= */

// fetch con retries simples para HTML
export async function fetchHTML(urlOrList, { timeoutMs = 15000, retries = 2 } = {}) {
  const urls = Array.isArray(urlOrList) ? urlOrList : [urlOrList];
  let lastErr = null;

  for (const url of urls) {
    const attemptForUrl = async () => {
      for (let i = 0; i <= retries; i++) {
        try {
          const ctrl = new AbortController();
          const id = setTimeout(() => ctrl.abort(), timeoutMs);

          const res = await fetch(url, {
            signal: ctrl.signal,
            redirect: "follow",
            headers: {
              "user-agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome Safari",
              accept: "text/html,application/xhtml+xml",
              "accept-language": "es-PE,es;q=0.9,en;q=0.8",
            },
          });

          clearTimeout(id);

          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const html = await res.text();
          if (html && html.length > 100) return html; // heurística mínima válida
          throw new Error("respuesta vacía");
        } catch (e) {
          lastErr = e;
          if (i < retries) await new Promise(r => setTimeout(r, 400 * (i + 1)));
        }
      }
      return null;
    };

    const got = await attemptForUrl();
    if (got) return got;
  }
  if (lastErr) throw lastErr;
  return "";
}

// RSS ligero/tolerante (items <item> y Atom <entry>)
export async function fetchRSS(url, max = 20, { timeoutMs = 15000 } = {}) {
  try {
    const ctrl = new AbortController();
    const id = setTimeout(() => ctrl.abort(), timeoutMs);

    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: {
        "user-agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome Safari",
        accept: "application/rss+xml, application/atom+xml, application/xml;q=0.9, */*;q=0.8",
        "accept-language": "es-PE,es;q=0.9,en;q=0.8",
      },
    });
    clearTimeout(id);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const xml = await res.text();

    const out = [];

    const get = (re, s) => (s.match(re)?.[1] || "").trim();

    const getCDATA = (s = "") =>
      s.replace(/<!\[CDATA\[/g, "").replace(/\]\]>/g, "").trim();

    // RSS <item>
    const itemRe = /<item[\s\S]*?<\/item>/gi;
    const titleRe = /<title[^>]*>([\s\S]*?)<\/title>/i;
    const linkRe = /<link[^>]*>([\s\S]*?)<\/link>/i;
    const guidRe = /<guid[^>]*>([\s\S]*?)<\/guid>/i;
    const descRe = /<description[^>]*>([\s\S]*?)<\/description>/i;
    const contentRe = /<content:encoded[^>]*>([\s\S]*?)<\/content:encoded>/i;
    const dateRe = /<pubDate[^>]*>([\s\S]*?)<\/pubDate>|<dc:date[^>]*>([\s\S]*?)<\/dc:date>/i;
    const mediaContentRe = /<media:content[^>]*url=["']([^"']+)["'][^>]*>/i;
    const mediaThumbRe = /<media:thumbnail[^>]*url=["']([^"']+)["'][^>]*>/i;
    const enclosureRe = /<enclosure[^>]*url=["']([^"']+)["'][^>]*>/i;

    let m;
    while ((m = itemRe.exec(xml)) && out.length < max) {
      const chunk = m[0];
      const title = get(titleRe, chunk);
      const link = get(linkRe, chunk) || get(guidRe, chunk);
      const desc = get(descRe, chunk) || get(contentRe, chunk);
      const rawDate = get(dateRe, chunk) || "";
      const media =
        get(mediaContentRe, chunk) ||
        get(mediaThumbRe, chunk) ||
        get(enclosureRe, chunk) ||
        "";

      out.push({
        titulo: normalizeText(getCDATA(title)),
        resumen: stripHtml(getCDATA(desc)),
        url: ensureHttps(getCDATA(link)),
        fecha: smartDate(getCDATA(rawDate)),
        imagen: ensureHttps(media),
      });
    }

    // ATOM <entry>
    if (!out.length) {
      const entryRe = /<entry[\s\S]*?<\/entry>/gi;
      const titleReA = /<title[^>]*>([\s\S]*?)<\/title>/i;
      const linkAltReA = /<link[^>]*rel=["']alternate["'][^>]*href=["']?([^"'>\s]+)["']?[^>]*\/?>/i;
      const linkAnyReA = /<link[^>]*href=["']?([^"'>\s]+)["']?[^>]*\/?>/i;
      const sumReA = /<summary[^>]*>([\s\S]*?)<\/summary>|<content[^>]*>([\s\S]*?)<\/content>/i;
      const dateReA = /<updated[^>]*>([\s\S]*?)<\/updated>|<published[^>]*>([\s\S]*?)<\/published>/i;

      let ea;
      while ((ea = entryRe.exec(xml)) && out.length < max) {
        const chunk = ea[0];
        const title = get(titleReA, chunk);
        const link =
          get(linkAltReA, chunk) || get(linkAnyReA, chunk);
        const desc = get(sumReA, chunk);
        const rawDate = get(dateReA, chunk) || "";

        out.push({
          titulo: normalizeText(getCDATA(title)),
          resumen: stripHtml(getCDATA(desc)),
          url: ensureHttps(getCDATA(link)),
          fecha: smartDate(getCDATA(rawDate)),
          imagen: "",
        });
      }
    }

    return out.slice(0, max);
  } catch (e) {
    console.warn("fetchRSS error:", e?.message || e);
    return [];
  }
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
  const titulo = normalizeText(n.titulo ?? n.title ?? "");
  const resumenRaw = n.resumen ?? n.description ?? n.summary ?? n.abstract ?? "";
  const resumen = /<\/?[a-z][\s\S]*>/i.test(resumenRaw)
    ? stripHtml(resumenRaw)
    : normalizeText(resumenRaw);

  const url = ensureHttps(n.url ?? n.link ?? n.enlace ?? "");
  const imagen = ensureHttps(n.imagen ?? n.image ?? n.thumbnail ?? n.cover ?? "");
  const fuente = normalizeText(n.fuente ?? n.source ?? hostFromUrl(url) ?? "");
  const fecha = toISODate(n.fecha ?? n.pubDate ?? n.date ?? n.publishedAt ?? null);

  const lang = ((n.lang ?? guessLang(`${titulo} ${resumen}`)) || "es").toLowerCase();

  const id =
    n.id ??
    n._id ??
    n.guid ??
    url ??
    `${fuente}-${titulo}`.slice(0, 96);

  const video =
    Boolean(n.video || n.videoUrl) ||
    (n.media && /video/i.test(String(n.media)));

  return {
    id,
    titulo,
    resumen,
    url,
    imagen,
    fuente,
    fecha,  // ISO o null
    lang,   // 'es' | 'en' | 'pt' | ...
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

// Alias para compat con código previo
export const isCompleteBySummary = (n) =>
  isCompleteEnough(n?.resumen || n?.contenido || "", n?.bodyHtml || "");

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
    if (!k1 && k2.trim() && seenFT.has(k2)) continue;
    if (k1) seenUrl.add(k1);
    else if (k2.trim()) seenFT.add(k2);
    out.push(n);
  }
  return out;
}
