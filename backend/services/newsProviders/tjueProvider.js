// ============================================================
// ?? B�hoLex | Provider TJUE (Tribunal de Justicia de la UE)
// Contrato: fetchNoticias({ max=10, q="", since=null })
// - Prueba varias rutas "Sala de prensa / Noticias" (cambian a menudo)
// - Selectores tolerantes a layout
// - Normaliza y etiqueta como: tipo=juridica, especialidad=internacional
// ============================================================

import * as cheerio from "cheerio";
import {
  fetchHTML,      // acepta string o string[]
  absUrl,
  normalizeText,
  toISODate,
  proxifyMedia,
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
    $el.find("h2 a, h3 a, .entry-title a, .title a").first().text() ||
    $el.find("h2, h3, .entry-title, .title").first().text() ||
    $el.find("a").first().text() ||
    "";
  return normalizeText(t);
}

function pickHref($el, base) {
  const a =
    $el
      .find("h2 a, h3 a, .entry-title a, .title a, a[href]")
      .filter((i, el) => {
        const href = (el.attribs?.href || "").trim();
        return href && href !== "#";
      })
      .first();
  return absUrl(a.attr("href") || "", base);
}

function pickResumen($el) {
  const r =
    $el.find(".summary p, .teaser p, .entry-summary p, p").first().text() ||
    $el.find(".summary, .teaser, .entry-summary").first().text() ||
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
  const raw =
    $el.find("time").attr("datetime") ||
    $el.find("time, .date").first().text() ||
    "";
  return toISODate(raw) || null;
}

/* ---------- Provider principal ---------- */
async function fetchNoticias({ max = 10, q = "", since = null } = {}) {
  const base = "https://curia.europa.eu";
  const candidates = [
    `${base}/jcms/jcms/Jo2_7060/es/`,   // Sala de prensa
    `${base}/jcms/jcms/P_95680/es/`,    // Noticias
    `${base}/jcms/jcms/Jo2_167699/es/`, // Comunicados (alterno frecuente)
  ];

  try {
    const html = await fetchHTML(candidates);
    if (!html) return [];

    const $ = cheerio.load(html);

    // Bloques t�picos: .actualites .article, .news-item, article
    const $cards = $(".actualites .article, .news-item, article, .actu-item");

    const out = [];
    $cards.each((_, el) => {
      const $el = $(el);

      const titulo = pickTitle($el);
      const enlace = pickHref($el, base);
      if (!titulo || !enlace) return;

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
          fuente: "TJUE",
          tipo: "juridica",
          especialidad: "internacional", // puedes cambiar a "derecho de la UE" si lo manejas en chips
          lang: "es", // la versi�n enlazada arriba est� en espa�ol
        })
      );
    });

    // Deduplicar por enlace
    const seen = new Set();
    let items = out.filter((n) => {
      const k = n.url || n.enlace;
      if (!k || seen.has(k)) return false;
      seen.add(k);
      return true;
    });

    // Filtros locales
    items = applySince(items, since);
    items = applyQ(items, q);

    // Orden por fecha desc
    items.sort((a, b) => new Date(b.fecha || 0) - new Date(a.fecha || 0));

    // Limitar salida
    const cap = Math.max(1, Math.min(50, Number(max) || 10));
    return items.slice(0, cap);
  } catch (e) {
    console.error("? TJUE provider:", e?.message || e);
    return [];
  }
}

export default fetchNoticias;
