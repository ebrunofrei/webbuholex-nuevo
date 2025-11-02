// backend/services/newsProviders/elPeruanoProvider.js
import axios from "axios";
import * as cheerio from "cheerio";
import { fetchHTML, absUrl, normalizeText, toISODate, proxifyMedia } from "./_helpers.js";

/**
 * Scraper ligero del buscador de El Peruano (sin Puppeteer).
 * Acepta { q, lang } y devuelve una lista normalizada.
 * Nota: El buscador funciona mejor con tÃ©rminos (p.ej. â€œcasaciÃ³nâ€, â€œSUNARPâ€).
 */
export default async function elPeruanoProvider({ q, lang = "es" } = {}) {
  try {
    const qs = new URLSearchParams();
    if (q) qs.set("s", q);

    const url = `https://busquedas.elperuano.pe/?${qs.toString()}`;
    const { data: html } = await axios.get(url, {
      timeout: 12000,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome Safari",
        Accept: "text/html,application/xhtml+xml",
      },
    });

    const $ = cheerio.load(html);
    const items = [];

    // Selector aproximado (puede ajustarse si cambia el sitio)
    $(".resultado-busqueda .detalle, .resultado .detalle, .resultado-busqueda li, article").each(
      (_, el) => {
        const $el = $(el);
        const a = $el.find("a[href]").first();
        const href = a.attr("href");
        if (!href) return;

        const titulo = a.text().trim();
        // resumen puede estar en <p> o similares
        const resumen =
          $el.find("p").first().text().trim() ||
          $el.text().trim().slice(0, 400);

        // fecha si estÃ¡ visible; si no, null
        const rawDate =
          $el.find("time").attr("datetime") ||
          $el.find(".fecha, .date").text().trim() ||
          null;

        items.push(
          normalizeItem({
            titulo,
            resumen,
            url: href.startsWith("http") ? href : `https://busquedas.elperuano.pe${href}`,
            imagen: "", // El buscador no siempre trae imagen
            fuente: "elperuano.pe",
            fecha: rawDate ? smartDate(rawDate) : null,
            lang,
          })
        );
      }
    );

    return items;
  } catch (e) {
    console.warn("elPeruanoProvider error:", e?.message || e);
    return [];
  }
}
