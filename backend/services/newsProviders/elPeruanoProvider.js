// ============================================================
// ?? BúhoLex | Provider El Peruano (buscador)
// - Contrato: export function fetchNoticias({ q, page, limit, lang, since, especialidad })
// - Sin puppeteer. Tolerante a cambios menores de layout.
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

const BASE = "https://busquedas.elperuano.pe";

/**
 * Construye URL de búsqueda. El sitio soporta `?s=<termino>` y a veces `&page=N`.
 */
function buildSearchUrl({ q = "", page = 1 }) {
  const qs = new URLSearchParams();
  if (q) qs.set("s", q);
  // muchas veces `page` funciona como 2,3... si hay paginación server-side
  if (page && Number(page) > 1) qs.set("page", String(page));
  const path = qs.toString() ? `/?${qs.toString()}` : "/";
  return `${BASE}${path}`;
}

function parseList($) {
  const items = [];

  // Selectores amplios: el buscador cambia wrappers con frecuencia
  const blocks = $(
    ".resultado-busqueda .detalle, .resultado .detalle, .resultado-busqueda li, article, .search-results .item, .listado .item"
  );

  blocks.each((_, el) => {
    const $el = $(el);

    // título + enlace
    const $a = $el
      .find("h3 a, h2 a, .titulo a, a[href]")
      .filter((i, a) => {
        const href = $(a).attr("href") || "";
        return href && href !== "#";
      })
      .first();

    const titulo = normalizeText($a.text());
    const href = $a.attr("href") || "";
    const enlace = absUrl(href, BASE);
    if (!titulo || !enlace) return;

    // resumen
    const resumen = normalizeText(
      $el.find("p").first().text() ||
        $el.find(".resumen, .summary, .extracto").first().text() ||
        ""
    );

    // fecha (si aparece)
    const rawFecha =
      $el.find("time").attr("datetime") ||
      normalizeText($el.find(".fecha, .date").first().text() || "");
    const fecha = toISODate(rawFecha); // tolera formatos “12/10/2025”, “2025-10-12”, etc.

    // imagen (rara vez presente en resultados)
    const rawImg =
      $el.find("img").attr("data-src") || $el.find("img").attr("src") || "";
    const imagenAbs = absUrl(rawImg, BASE);
    const imagen = imagenAbs ? proxifyMedia(imagenAbs) : "";

    items.push(
      normalizeItem({
        titulo,
        resumen,
        enlace,               // nuestro campo estándar
        imagen,
        fecha,
        fuente: "El Peruano",
        tipo: "juridica",
        // no forzamos especialidad; el backend/cliente filtra por texto si se requiere
        lang: "es",
      })
    );
  });

  return items;
}

async function fetchNoticias({
  q = "",
  page = 1,
  limit = 12,
  lang = "all",     // no filtra por idioma en fuente; lo dejamos para el agregador
  since = null,     // Date o ISO; filtramos aquí si llega
  // especialidad = "administrativo",  // opcional; el cliente puede filtrar por texto
} = {}) {
  try {
    const url = buildSearchUrl({ q, page });
    const html = await fetchHTML(url, { timeout: 15000 });
    if (!html) return [];

    const $ = cheerio.load(html);
    let items = parseList($);

    // Filtra por 'since' si viene
    if (since) {
      const d = new Date(since);
      if (!Number.isNaN(+d)) {
        items = items.filter((n) => {
          const nf = new Date(n.fecha || 0);
          return !Number.isNaN(+nf) && nf >= d;
        });
      }
    }

    // Orden: fecha desc (si no hay, queda al final)
    items.sort((a, b) => (new Date(b.fecha || 0) - new Date(a.fecha || 0)));

    // Limita tamaño (defensivo)
    const L = Math.max(1, Math.min(50, Number(limit) || 12));
    return items.slice(0, L);
  } catch (e) {
    console.warn("elPeruanoProvider error:", e?.message || e);
    return [];
  }
}

export default fetchNoticias;
