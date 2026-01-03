// ============================================================
// ?? B�hoLex | Provider ONU Noticias (RSS)
// Contrato: fetchNoticias({ q, page, limit, lang, since, especialidad })
// - Lee el feed tem�tico "Law and Crime Prevention" en espa�ol.
// - Parser RSS ligero (sin dependencias), tolerante a CDATA.
// - Normaliza con normalizeItem (o normalizeNoticia si prefieres).
// - Soporta filtros q/lang/since y paginaci�n.
// ============================================================

import {
  fetchHTML,
  normalizeText,
  toISODate,
  proxifyMedia,
  normalizeItem,  // usa normalizeItem para mantener el mismo contrato que CIJ/OEA
} from "./_helpers.js";

const FEED =
  "https://news.un.org/feed/subscribe/es/news/topic/law-and-crime-prevention/feed/rss.xml";

/* --------------------- Parser RSS ligero --------------------- */
function getTag(s, tag) {
  const m = s.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i"));
  return m ? m[1] : "";
}
function stripTags(s = "") {
  return s.replace(/<!\[CDATA\[/g, "")
          .replace(/\]\]>/g, "")
          .replace(/<[^>]+>/g, "");
}
function parseRSSItem(block) {
  const title = normalizeText(stripTags(getTag(block, "title")));
  const link =
    stripTags(getTag(block, "link")) ||
    (getTag(block, "guid") ? stripTags(getTag(block, "guid")) : "");
  const description = normalizeText(stripTags(getTag(block, "description")));
  const pub = normalizeText(stripTags(getTag(block, "pubDate")));

  // imagen: algunos RSS usan <enclosure url="..."> o media:content
  const enclosure =
    (block.match(/<enclosure[^>]*url="([^"]+)"/i) || [])[1] ||
    (block.match(/<media:content[^>]*url="([^"]+)"/i) || [])[1] ||
    "";

  return {
    titulo: title,
    resumen: description,
    enlace: link,
    imagen: enclosure ? proxifyMedia(enclosure) : "",
    fecha: toISODate(pub),
    fuente: "ONU Noticias",
    tipo: "general",             // ONU Noticias es m�s �general�; tu front a�n puede filtrar por �jur�dica�
    especialidad: "internacional",
    lang: "es",
  };
}
function parseRSS(xml = "") {
  const items = [];
  const blocks = xml.match(/<item[\s\S]*?<\/item>/gi) || [];
  for (const b of blocks) {
    const it = parseRSSItem(b);
    if (it.titulo && (it.enlace || it.url)) items.push(it);
  }
  return items;
}

/* ------------------ Filtro utilitarios ------------------ */
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
function applyLang(items, lang) {
  if (!lang || lang === "all") return items;
  const L = String(lang).toLowerCase();
  return items.filter((n) => String(n.lang || "es").toLowerCase().startsWith(L));
}

/* ------------------ Provider principal ------------------ */
async function fetchNoticias({
  q = "",
  page = 1,
  limit = 12,
  lang = "all",
  since = null,
  // especialidad: no filtramos duro aqu� (el feed ya es de �law & crime prevention�)
} = {}) {
  try {
    const xml = await fetchHTML(FEED, { timeout: 15000 });
    let raw = parseRSS(xml);
    if (!raw.length) return [];

    // normaliza al formato general
    let items = raw.map((r) =>
      normalizeItem({
        titulo: r.titulo,
        resumen: r.resumen,
        enlace: r.enlace,
        imagen: r.imagen,
        fecha: r.fecha,
        fuente: "ONU Noticias",
        tipo: r.tipo, // "general"
        especialidad: r.especialidad || "internacional",
        lang: r.lang || "es",
      })
    );

    // filtros
    items = applySince(items, since);
    items = applyQ(items, q);
    items = applyLang(items, lang);

    // orden (fecha desc)
    items.sort((a, b) => new Date(b.fecha || 0) - new Date(a.fecha || 0));

    // paginaci�n
    const L = Math.max(1, Math.min(50, Number(limit) || 12));
    const P = Math.max(1, Number(page) || 1);
    const start = (P - 1) * L;
    const end = start + L;

    return items.slice(start, end);
  } catch (e) {
    console.error("? ONU Noticias provider:", e?.message || e);
    return [];
  }
}

export default fetchNoticias;
