// backend/services/newsProviders/cijProvider.js
import * as cheerio from "cheerio";
import {
  fetchHTML, absUrl, normalizeText, toISODate, proxifyMedia, normalizeItem
} from "./_helpers.js";

/**
 * CIJ (Corte Internacional de Justicia) – provider
 * Scrapea listados /news | /press-releases con tolerancia a cambios de layout.
 */
export async function fetchCIJ({ max = 10 } = {}) {
  const base = "https://www.icj-cij.org";
  const candidates = [`${base}/news`, `${base}/press-releases`, `${base}/home`];

  try {
    const html = await fetchHTML(candidates);
    if (!html) return [];
    const $ = cheerio.load(html);
    const out = [];

    const $cards = $("article, .views-row, .news-item, .news__item, .press__item");

    $cards.slice(0, max).each((_, el) => {
      const $el = $(el);

      // título y enlace (evita href="#")
      const $a =
        $el.find("h3 a, h2 a, .node__title a, .title a, a[href]").filter((i, a) => {
          const h = $(a).attr("href") || "";
          return h && h !== "#";
        }).first();

      const rawTitle = normalizeText($a.text() || "");
      const href = $a.attr("href") || "";
      const enlace = absUrl(href, base);

      // resumen
      const rawResumen =
        $el.find(".field--name-body p, .teaser__text p, .summary p, p").first().text() ||
        $el.find(".field--name-body, .teaser__text, .summary").first().text() ||
        "";
      const resumen = normalizeText(rawResumen);

      // imagen (ignorar bullet.gif)
      const imgSrc =
        $el.find("img").attr("data-src") || $el.find("img").attr("src") || "";
      const imagenAbs = /bullet\.gif$/i.test(imgSrc) ? "" : absUrl(imgSrc, base);
      const imagen = imagenAbs ? proxifyMedia(imagenAbs) : "";

      // fecha
      const rawFecha = $el.find("time").attr("datetime") || $el.find("time, .date").first().text() || "";
      const fecha = toISODate(rawFecha);

      if (rawTitle && enlace) {
        const item = normalizeItem({
          titulo: rawTitle,
          resumen,
          enlace,            // nuestro modelo
          imagen,
          fecha,
          fuente: "CIJ",
          tipo: "juridica",
          especialidad: "internacional",
          // lang opcional (normalizeItem infiere si no lo envías)
        });

        // si normalizeItem dejó url vacío, fuerza enlace
        if (!item.url) item.url = enlace;

        // id estable si viniera vacío
        if (!item.id) item.id = enlace;

        out.push(item);
      }
    });

    return out;
  } catch (e) {
    console.error("❌ CIJ:", e?.message || e);
    return [];
  }
}
