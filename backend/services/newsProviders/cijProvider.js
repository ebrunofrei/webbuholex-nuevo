// ============================================================
// ?? BúhoLex | Provider CIJ (Corte Internacional de Justicia)
// - Rutas candidatas: /news, /press-releases, /home
// - Soporta: q, limit, since, lang, especialidad, page (ignorado)
// - Devuelve array de ítems normalizados (para aggregator)
// ============================================================
import * as cheerio from "cheerio";
import {
  fetchHTML,
  absUrl,
  normalizeText,
  toISODate,
  proxifyMedia,
  normalizeItem,
} from "./_helpers.js";

const BASE = "https://www.icj-cij.org";
const CANDIDATES = [`${BASE}/news`, `${BASE}/press-releases`, `${BASE}/home`];

function mediaScore(n) {
  return n?.video ? 2 : n?.imagen ? 1 : 0;
}

async function fetchNoticias({
  q = "",
  limit = 12,
  since = null,         // Date o ISO; el aggregator ya lo manda si aplica
  lang = "all",
  especialidad = "internacional",
  // page se ignora: el listado de CIJ es estático (paginación JS)
} = {}) {
  try {
    const html = await fetchHTML(CANDIDATES, { timeout: 15000 });
    if (!html) return [];

    const $ = cheerio.load(html);
    const out = [];

    // tarjetas flexibles
    const $cards = $("article, .views-row, .news-item, .news__item, .press__item, .node");

    $cards.each((_, el) => {
      const $el = $(el);

      // Título + enlace (evitar href "#")
      const $a = $el
        .find("h3 a, h2 a, .node__title a, .title a, a[href]")
        .filter((i, a) => {
          const h = $(a).attr("href") || "";
          return h && h !== "#";
        })
        .first();

      const rawTitle = normalizeText($a.text() || "");
      const href = $a.attr("href") || "";
      const enlace = absUrl(href, BASE);

      if (!rawTitle || !enlace) return;

      // Resumen
      const rawResumen =
        $el.find(".field--name-body p, .teaser__text p, .summary p, p").first().text() ||
        $el.find(".field--name-body, .teaser__text, .summary").first().text() ||
        "";
      const resumen = normalizeText(rawResumen);

      // Imagen (filtra bullet.gif)
      const imgSrc = $el.find("img").attr("data-src") || $el.find("img").attr("src") || "";
      const imagenAbs = /bullet\.gif$/i.test(imgSrc) ? "" : absUrl(imgSrc, BASE);
      const imagen = imagenAbs ? proxifyMedia(imagenAbs) : "";

      // Fecha (time[datetime] o texto)
      const rawFecha =
        $el.find("time").attr("datetime") ||
        $el.find("time, .date, .news__date, .press__date").first().text() ||
        "";
      const fecha = toISODate(rawFecha);

      const item = normalizeItem({
        titulo: rawTitle,
        resumen,
        enlace,
        imagen,
        fecha,
        fuente: "CIJ",
        tipo: "juridica",
        especialidad: "internacional",
        lang, // el helper infiere si no coincide, pero no molesta
      });

      // Garantías mínimas
      if (!item.url) item.url = enlace;
      if (!item.id) item.id = enlace;
      if (!item.fuenteNorm) item.fuenteNorm = "cij";

      out.push(item);
    });

    // Filtro temporal (por si el aggregator no lo aplicó)
    let items = out;
    if (since) {
      const d = new Date(since);
      if (!Number.isNaN(+d)) {
        items = items.filter((n) => {
          const nf = new Date(n.fecha || 0);
          return !Number.isNaN(+nf) && nf >= d;
        });
      }
    }

    // Filtro por q (tópicos simples, coma separada)
    if (q && q.trim()) {
      const toks = q
        .split(",")
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean);
      if (toks.length) {
        items = items.filter((n) => {
          const hay = `${n.titulo || ""} ${n.resumen || ""}`.toLowerCase();
          return toks.every((t) => hay.includes(t));
        });
      }
    }

    // Orden: fecha desc ? media
    items.sort((a, b) => {
      const da = new Date(a.fecha || 0).getTime();
      const db = new Date(b.fecha || 0).getTime();
      if (db !== da) return db - da;
      return mediaScore(b) - mediaScore(a);
    });

    // Limit final
    return items.slice(0, Math.max(1, Math.min(50, Number(limit) || 12)));
  } catch (e) {
    console.error("? CIJ provider:", e?.message || e);
    return [];
  }
}

export default fetchNoticias;
