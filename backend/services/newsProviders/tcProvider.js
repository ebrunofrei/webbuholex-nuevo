// backend/services/newsProviders/tcProvider.js
// ============================================================
// ?? BúhoLex | Provider Tribunal Constitucional (TC)
// Contrato: fetchNoticias({ max=10, q="", since=null })
// - Intenta varias rutas conocidas del TC (cambian a veces)
// - Selectores tolerantes a layout (article, .post, .noticia, etc.)
// - Normaliza título, resumen, enlace, imagen, fecha, fuente, tipo, especialidad
// - Filtros locales: since (ISO o Date) y q (búsqueda simple)
// ============================================================

import * as cheerio from "cheerio";
import {
  fetchHTML,      // acepta string o string[]
  absUrl,
  normalizeText,
  toISODate,      // convierte "13/10/2025", "13 de oct..." o datetime ? ISO
  proxifyMedia,   // para evitar hotlink
} from "./_helpers.js";
import { normalizeNoticia } from "./normalizer.js";

/* ---------- Filtros locales ---------- */
function applySince(items, since) {
  if (!since) return items;
  const d = new Date(since);
  if (Number.isNaN(+d)) return items;
  return items.filter((n) => {
    const nf = new Date(n.fecha || 0);
    return !Number.isNaN(+nf) && nf >= d;
  });
}

function applyQ(items, q) {
  if (!q || !q.trim()) return items;
  const tok = q.toLowerCase();
  return items.filter(
    (n) =>
      String(n.titulo || "").toLowerCase().includes(tok) ||
      String(n.resumen || "").toLowerCase().includes(tok)
  );
}

/* ---------- Extractores tolerantes ---------- */
function pickTitle($el) {
  const t =
    $el.find("h2 a, h3 a, .entry-title a, .titulo a").first().text() ||
    $el.find("h2, h3, .entry-title, .titulo").first().text() ||
    $el.find("a").first().text() ||
    "";
  return normalizeText(t);
}

function pickHref($el, base) {
  const a =
    $el.find("h2 a, h3 a, .entry-title a, .titulo a, a[href]").filter((i, el) => {
      const href = (el.attribs?.href || "").trim();
      return href && href !== "#";
    }).first();
  return absUrl(a.attr("href") || "", base);
}

function pickResumen($el) {
  const r =
    $el.find(".entry-summary p, .resumen p, .excerpt p, .summary p").first().text() ||
    $el.find(".entry-summary, .resumen, .excerpt, .summary").first().text() ||
    $el.find("p").first().text() ||
    "";
  return normalizeText(r).slice(0, 600);
}

function pickImagen($el, base) {
  const img =
    $el.find("img").attr("data-src") ||
    $el.find("img").attr("src") ||
    "";
  const abs = absUrl(img, base);
  return abs ? proxifyMedia(abs) : "";
}

function pickFecha($el) {
  // time datetime, time text o chips de fecha sueltos
  const raw =
    $el.find("time").attr("datetime") ||
    $el.find("time").first().text() ||
    $el.find(".date, .fecha, .posted-on").first().text() ||
    "";
  return toISODate(raw) || null;
}

/* ---------- Provider principal ---------- */
async function fetchNoticias({ max = 10, q = "", since = null } = {}) {
  const base = "https://www.tc.gob.pe";
  // El TC ha usado /noticias, /noticias_tc, e incluso categorías
  const candidates = [
    `${base}/noticias_tc/`,
    `${base}/noticias/`,
    `${base}/categoria/noticias/`,
    base, // por si redirige a portada con carrusel
  ];

  try {
    const html = await fetchHTML(candidates);
    if (!html) return [];

    const $ = cheerio.load(html);
    // Conjuntos típicos de listados
    const $cards = $(
      "article, .post, .noticia, .news-item, .entry, .listado-noticias article"
    );

    const out = [];
    $cards.each((_, el) => {
      const $el = $(el);

      const titulo = pickTitle($el);
      const enlace = pickHref($el, base);
      if (!titulo || !enlace) return; // sin esto, descarta

      const resumen = pickResumen($el);
      const imagen = pickImagen($el, base);
      const fecha = pickFecha($el);

      out.push(
        normalizeNoticia({
          titulo,
          resumen,
          url: enlace,
          imagen,
          fecha,
          fuente: "Tribunal Constitucional",
          tipo: "juridica",
          especialidad: "constitucional",
          lang: "es",
        })
      );
    });

    // Dedup por enlace (algunos listados repiten)
    const seen = new Set();
    let items = out.filter((n) => {
      const k = n.url || n.enlace;
      if (!k || seen.has(k)) return false;
      seen.add(k);
      return true;
    });

    // filtros locales
    items = applySince(items, since);
    items = applyQ(items, q);

    // orden por fecha desc
    items.sort((a, b) => new Date(b.fecha || 0) - new Date(a.fecha || 0));

    // limitar
    const cap = Math.max(1, Math.min(50, Number(max) || 10));
    return items.slice(0, cap);
  } catch (e) {
    console.error("? TC provider:", e?.message || e);
    return [];
  }
}

export default fetchNoticias;
