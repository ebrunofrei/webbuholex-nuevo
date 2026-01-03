// ============================================================
// ?? B�hoLex | Provider JNJ (Junta Nacional de Justicia)
// Contrato: fetchNoticias({ q, page, limit, lang, since, especialidad })
// - Scrape est�tico con cheerio (sin navegador).
// - Tolerante a cambios de layout (selectores amplios).
// - Normaliza salida con normalizeItem (url/enlace/fecha/imagen/fuente/tipo/lang).
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

const BASES = ["https://www.jnj.gob.pe", "https://jnj.gob.pe"];
const PATH = "/noticias/";

/** Parseo del listado de noticias de JNJ */
function parseJNJList(html, baseHref) {
  const $ = cheerio.load(html);
  const out = [];

  // Cubrimos variaciones (WP/Drupal)
  const cards = $("article, .post, .news-item, .noticia, .card, .post-card");

  cards.each((_, el) => {
    const $el = $(el);

    // Anchor v�lido
    const $a = $el
      .find("h3 a, h2 a, .entry-title a, .title a, a[href]")
      .filter((i, a) => {
        const h = $(a).attr("href") || "";
        return h && h !== "#";
      })
      .first();

    const rawTitle =
      normalizeText($el.find("h3, h2, .entry-title, .title").first().text()) ||
      normalizeText($a.text());
    const href = $a.attr("href") || "";
    const enlace = absUrl(href, baseHref);

    if (!rawTitle || !enlace) return;

    // Resumen (primer p�rrafo razonable)
    const rawResumen =
      $el.find(".entry-summary p, .summary p, .excerpt p, p").first().text() ||
      $el.find(".entry-summary, .summary, .excerpt").first().text() ||
      "";
    const resumen = normalizeText(rawResumen);

    // Fecha
    const rawFecha =
      $el.find("time").attr("datetime") ||
      normalizeText(
        $el.find(".date, .post-date, .entry-date, .published").first().text()
      ) ||
      "";
    const fecha = toISODate(rawFecha);

    // Imagen (soporta lazy)
    const rawImg =
      $el.find("img").attr("data-src") ||
      $el.find("img").attr("data-lazy-src") ||
      $el.find("img").attr("src") ||
      "";
    const absImg = absUrl(rawImg, baseHref);
    const imagen =
      absImg && !/\.svg(\?|$)/i.test(absImg) ? proxifyMedia(absImg) : "";

    out.push(
      normalizeItem({
        titulo: rawTitle,
        resumen,
        enlace,
        imagen,
        fecha,
        fuente: "JNJ",
        tipo: "juridica",
        lang: "es",
      })
    );
  });

  return out;
}

/** Provider principal (contrato unificado) */
async function fetchNoticias({
  q = "",
  page = 1,
  limit = 12,
  lang = "all",
  since = null,
  // especialidad = "", // si quieres, puedes inferir por texto a otra capa
} = {}) {
  try {
    // 1) Intentar con ambas bases (al primero que responda con 200 y HTML)
    const urls = BASES.map((b) => `${b}${PATH}`);
    const html = await fetchHTML(urls, { timeout: 20000 });
    if (!html) return [];

    // Determinar baseHref consistente (tomamos la primera base candidata por simplicidad)
    // Si tu fetchHTML te puede devolver la URL final, �sala. Si no, usamos BASES[0].
    const baseHref = BASES.find((b) => html.includes("jnj")) || BASES[0];

    // 2) Parseo
    let items = parseJNJList(html, baseHref);

    // 3) Filtrado por since (si llega). Tu pol�tica es = 2 d�as para jur�dicas.
    if (since) {
      const d = new Date(since);
      if (!Number.isNaN(+d)) {
        items = items.filter((n) => {
          const nf = new Date(n.fecha || 0);
          return !Number.isNaN(+nf) && nf >= d;
        });
      }
    }

    // 4) Filtro por q (t�tulo/resumen simple)
    if (q && q.trim()) {
      const tok = q.toLowerCase();
      items = items.filter(
        (n) =>
          String(n.titulo || "").toLowerCase().includes(tok) ||
          String(n.resumen || "").toLowerCase().includes(tok)
      );
    }

    // 5) Filtro lang (casi siempre �es� en JNJ, pero lo dejamos por coherencia)
    if (lang && lang !== "all") {
      const langTok = lang.toLowerCase();
      items = items.filter((n) =>
        String(n.lang || "es").toLowerCase().startsWith(langTok)
      );
    }

    // 6) Orden por fecha desc
    items.sort((a, b) => new Date(b.fecha || 0) - new Date(a.fecha || 0));

    // 7) Paginaci�n
    const L = Math.max(1, Math.min(50, Number(limit) || 12));
    const P = Math.max(1, Number(page) || 1);
    const start = (P - 1) * L;
    const end = start + L;

    return items.slice(start, end);
  } catch (e) {
    console.error("? JNJ:", e?.message || e);
    return [];
  }
}

export default fetchNoticias;
