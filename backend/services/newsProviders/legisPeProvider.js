// ============================================================
// ?? B�hoLex | Provider Legis.pe
// Contrato unificado: fetchNoticias({ q, page, limit, lang, since, especialidad })
// - Scraping est�tico con cheerio (sin Puppeteer).
// - Tolerante a cambios de layout (selectores amplios del theme JNews).
// - Normaliza salida con normalizeItem (url/enlace/fecha/imagen/fuente/tipo/lang).
// - Filtra por since (= 48h en jur�dicas), q, lang y pagina.
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

const BASE = "https://legis.pe";
// P�ginas m�s estables del theme para noticias
const CANDIDATES = [
  `${BASE}/categorias/noticias/`,
  `${BASE}/categoria/noticias/`,
  `${BASE}/`,
];

/** Extrae la mejor URL de imagen posible (soporta lazy/srcset) */
function pickImage($img, baseHref) {
  if (!$img || $img.length === 0) return "";
  const lazy =
    $img.attr("data-src") ||
    $img.attr("data-lazy-src") ||
    $img.attr("data-original") ||
    $img.attr("data-jpibfi-src") ||
    "";

  let src = lazy || $img.attr("src") || "";

  // Intenta srcset (toma la primera URL)
  if (!src) {
    const srcset = $img.attr("srcset") || "";
    const first = srcset.split(",")[0]?.trim().split(" ")[0];
    if (first) src = first;
  }

  if (!src) return "";
  const abs = absUrl(src, baseHref);
  if (!abs || /\.svg(\?|$)/i.test(abs)) return "";
  return proxifyMedia(abs);
}

/** Parseo de una tarjeta de JNews (jeg_*) ? {titulo,resumen,enlace,imagen,fecha} */
function parseCard($el, $, baseHref) {
  // T�tulo + enlace
  const $a = $el
    .find(".jeg_post_title a, .entry-title a, h3 a, h2 a, a.jeg_readmore, a[href]")
    .filter((i, a) => {
      const h = $(a).attr("href") || "";
      return h && h !== "#";
    })
    .first();

  const rawTitle =
    normalizeText(
      $el.find(".jeg_post_title, .entry-title, h3, h2").first().text()
    ) || normalizeText($a.text());
  const href = $a.attr("href") || "";
  const enlace = absUrl(href, baseHref);
  if (!rawTitle || !enlace) return null;

  // Resumen
  const rawResumen =
    $el.find(".jeg_post_excerpt, .entry-excerpt, .excerpt, .jeg_block_content p, p")
      .first()
      .text() || "";
  const resumen = normalizeText(rawResumen);

  // Fecha
  const rawFecha =
    $el.find("time").attr("datetime") ||
    normalizeText($el.find(".jeg_meta_date, .date, .post-date, .entry-date").first().text()) ||
    "";
  const fecha = toISODate(rawFecha); // cae a null si no parsea

  // Imagen
  const imagen = pickImage($el.find("img").first(), baseHref);

  return { titulo: rawTitle, resumen, enlace, imagen, fecha };
}

/** Clasificador r�pido de especialidad por keywords (fallback) */
function detectEspecialidad(texto = "") {
  const t = texto.toLowerCase();
  if (/\bpenal\b|delit|fiscal|mp\b/.test(t)) return "penal";
  if (/\bcivil\b|propiedad|contrato|obligaci/.test(t)) return "civil";
  if (/\blaboral\b|trabajador|sindicat|sunafil/.test(t)) return "laboral";
  if (/constitucional|tribunal constitucional|[^a-z]tc[^a-z]/.test(t)) return "constitucional";
  if (/familiar|alimentos|tenencia|violencia/.test(t)) return "familiar";
  if (/administrativo|tupa|procedimiento administr|resoluci/.test(t)) return "administrativo";
  if (/procesal|proceso|procedimiento/.test(t)) return "procesal";
  if (/registral|sunarp|registro|partida/.test(t)) return "registral";
  if (/tributario|sunat|igv|renta|impuesto/.test(t)) return "tributario";
  if (/ambiental|oeefa|impacto ambiental|eia/.test(t)) return "ambiental";
  if (/notarial|notario/.test(t)) return "notarial";
  if (/consumidor|indecopi/.test(t)) return "consumidor";
  if (/penitenciario|inpe|prisi/.test(t)) return "penitenciario";
  return "general";
}

/** Parsea un listado de noticias de Legis a objetos normalizados */
function parseLegisList(html, baseHref) {
  const $ = cheerio.load(html);
  const out = [];

  // El theme JNews usa contenedores .jeg_posts, .jeg_thumb, etc.
  const cards = $(
    ".jeg_post, article, .jeg_thumb, .jeg_posts, .jeg_postblock_content .jeg_posts .jeg_post"
  );

  cards.each((_, el) => {
    const data = parseCard($(el), $, baseHref);
    if (!data) return;

    out.push(
      normalizeItem({
        titulo: data.titulo,
        resumen: data.resumen,
        enlace: data.enlace,
        imagen: data.imagen,
        fecha: data.fecha,
        fuente: "legis.pe",
        tipo: "juridica",
        // Si no guardas especialidad en DB para scrapers al vuelo, al menos infiere:
        especialidad: detectEspecialidad(`${data.titulo} ${data.resumen}`),
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
  // especialidad (opcional para filtrar estricto si quisieras)
} = {}) {
  try {
    const html = await fetchHTML(CANDIDATES, { timeout: 20000 });
    if (!html) return [];

    const baseHref = BASE; // est�tico; si fetchHTML retorna URL final, �sala aqu�
    let items = parseLegisList(html, baseHref);

    // Filtro since (= 48h recomendado para jur�dicas)
    if (since) {
      const d = new Date(since);
      if (!Number.isNaN(+d)) {
        items = items.filter((n) => {
          const nf = new Date(n.fecha || 0);
          return !Number.isNaN(+nf) && nf >= d;
        });
      }
    }

    // Filtro q (basta con t�tulo/resumen)
    if (q && q.trim()) {
      const tok = q.toLowerCase();
      items = items.filter(
        (n) =>
          String(n.titulo || "").toLowerCase().includes(tok) ||
          String(n.resumen || "").toLowerCase().includes(tok)
      );
    }

    // Filtro lang (Legis es �es�, pero mantenemos coherencia)
    if (lang && lang !== "all") {
      const l = String(lang).toLowerCase();
      items = items.filter((n) => String(n.lang || "es").toLowerCase().startsWith(l));
    }

    // Orden por fecha desc (si no hay fecha, lo empuja al final)
    items.sort((a, b) => new Date(b.fecha || 0) - new Date(a.fecha || 0));

    // Paginaci�n segura
    const L = Math.max(1, Math.min(50, Number(limit) || 12));
    const P = Math.max(1, Number(page) || 1);
    const start = (P - 1) * L;
    const end = start + L;

    return items.slice(start, end);
  } catch (e) {
    console.error("? legis.pe:", e?.message || e);
    return [];
  }
}

export default fetchNoticias;
