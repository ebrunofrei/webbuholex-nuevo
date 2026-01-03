// ============================================================
// ?? B�hoLex | Provider Corte IDH
// - Fuentes candidatas: Jurisprudencia (docs), Comunicados, Noticias
// - Contrato: export function fetchNoticias({ q, limit, since, lang, especialidad })
// - Normaliza a tu formato est�ndar del agregador
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

const BASE = "https://www.corteidh.or.cr";
const CANDIDATES = [
  `${BASE}/cf/jurisprudencia.cfm`,   // listados de resoluciones / sentencias (documentos)
  `${BASE}/cf/comunicados.cfm`,      // comunicados
  `${BASE}/cf/noticias.cfm`,         // noticias
];

function mediaScore(n) {
  return n?.video ? 2 : n?.imagen ? 1 : 0;
}

// -------- parsers espec�ficos por tipo de p�gina ----------
function parseJurisprudencia($) {
  const out = [];
  // En "jurisprudencia.cfm" suele haber enlaces directos a /docs/...
  $("a[href*='/docs/']").each((_, a) => {
    const $a = $(a);
    const titulo = normalizeText($a.text());
    const href = $a.attr("href") || "";
    const enlace = absUrl(href, BASE);
    if (!titulo || !enlace) return;

    out.push(
      normalizeItem({
        titulo,
        resumen: "Documento jur�dico / fallo reciente",
        enlace,
        fecha: null, // no siempre est� en el listado
        imagen: "",  // no aplicar�a; PDF/Doc
        fuente: "Corte IDH",
        tipo: "juridica",
        especialidad: "derechos humanos",
        lang: "es",
      })
    );
  });
  return out;
}

function parseComunicadosONoticias($) {
  const out = [];
  // Bloques comunes (var�an por versi�n del CMS)
  const cards = $(
    "article, .views-row, .noticia, .news__item, .item, .lista a, .listado a"
  );
  cards.each((_, el) => {
    const $el = $(el);

    // t�tulo + enlace
    const $a = $el
      .find("h3 a, h2 a, .title a, a[href]")
      .filter((i, a) => {
        const h = $(a).attr("href") || "";
        return h && h !== "#";
      })
      .first();
    const titulo = normalizeText($a.text());
    const enlace = absUrl($a.attr("href") || "", BASE);
    if (!titulo || !enlace) return;

    // resumen (si existe)
    const resumen = normalizeText(
      $el.find("p").first().text() ||
        $el.find(".resumen, .summary, .teaser").first().text() ||
        ""
    );

    // fecha (si existe)
    const rawFecha =
      $el.find("time").attr("datetime") ||
      $el.find("time, .fecha, .date").first().text() ||
      "";
    const fecha = toISODate(rawFecha);

    // imagen (si existe)
    const rawImg =
      $el.find("img").attr("data-src") || $el.find("img").attr("src") || "";
    const imagenAbs = absUrl(rawImg, BASE);
    const imagen = imagenAbs ? proxifyMedia(imagenAbs) : "";

    out.push(
      normalizeItem({
        titulo,
        resumen,
        enlace,
        fecha,
        imagen,
        fuente: "Corte IDH",
        tipo: "juridica",
        especialidad: "derechos humanos",
        lang: "es",
      })
    );
  });
  return out;
}

// --------------- contrato principal para el agregador ---------------
async function fetchNoticias({
  q = "",
  limit = 12,
  since = null,              // Date o ISO
  lang = "all",
  especialidad = "derechos humanos",
} = {}) {
  try {
    // Trae la primera p�gina que responda entre las candidatas
    const html = await fetchHTML(CANDIDATES, { timeout: 15000 });
    if (!html) return [];

    const $ = cheerio.load(html);
    // Heur�stica: si hay docs -> jurisprudencia; si no, comunicados/noticias
    const isDocs = $("a[href*='/docs/']").length > 3;

    let items = isDocs ? parseJurisprudencia($) : parseComunicadosONoticias($);

    // Filtro por since (l�mite temporal)
    if (since) {
      const d = new Date(since);
      if (!Number.isNaN(+d)) {
        items = items.filter((n) => {
          const nf = new Date(n.fecha || 0);
          return !Number.isNaN(+nf) && nf >= d;
        });
      }
    }

    // Filtro por q (coma separada)
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

    return items.slice(0, Math.max(1, Math.min(50, Number(limit) || 12)));
  } catch (err) {
    console.error("? Corte IDH provider:", err?.message || err);
    return [];
  }
}

// Compat (si lo estabas llamando as� en alg�n sitio viejo)
export async function fetchCorteIDH(opts = {}) {
  return fetchNoticias({ limit: 10, ...opts });
}

export default fetchNoticias;
