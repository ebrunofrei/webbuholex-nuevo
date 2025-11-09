// backend/services/newsProviders/sunarpProvider.js
// ============================================================
// ?? BúhoLex | Provider SUNARP (RSS)
// Contrato: fetchNoticias({ max=10, q="", since=null })
// - Lee uno de varios feeds RSS
// - Normaliza campos (titulo, resumen, enlace, fecha, imagen, fuente, tipo, especialidad)
// - Aplica filtros ligeros en memoria (q, since)
// ============================================================

import {
  fetchRSS,         // ? asegúrate de exportarlo en _helpers.js
  toISODate,
  normalizeText,
  proxifyMedia,
} from "./_helpers.js";
import { normalizeNoticia } from "./normalizer.js";

/** Filtro local por fecha mínima */
function applySince(items, since) {
  if (!since) return items;
  const d = new Date(since);
  if (Number.isNaN(+d)) return items;
  return items.filter((n) => {
    const nf = new Date(n.fecha || 0);
    return !Number.isNaN(+nf) && nf >= d;
  });
}

/** Filtro local por búsqueda simple */
function applyQ(items, q) {
  if (!q || !q.trim()) return items;
  const tok = q.toLowerCase();
  return items.filter(
    (n) =>
      String(n.titulo || "").toLowerCase().includes(tok) ||
      String(n.resumen || "").toLowerCase().includes(tok)
  );
}

async function fetchNoticias({ max = 10, q = "", since = null } = {}) {
  const feeds = [
    "https://www.sunarp.gob.pe/rss/noticias.xml",
    // alterno posible si cambian rutas:
    "https://www.sunarp.gob.pe/rss/rss_noticias.xml",
  ];

  for (const url of feeds) {
    try {
      // fetchRSS debe devolver [{ title, link, description, pubDate, enclosure?, media? }, ...]
      const raw = await fetchRSS(url, max, {
        timeout: 12000,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome Safari",
          Accept: "application/rss+xml, application/xml, text/xml;q=0.9, */*;q=0.8",
        },
      });

      let items = (raw || []).map((n) => {
        const titulo = normalizeText(n.title || n.titulo || "");
        const enlace = n.link || n.enlace || "";
        const resumen = normalizeText(n.description || n.resumen || "");
        const fecha =
          toISODate(n.pubDate || n.fecha || n.published || n.updated) || null;

        // intenta encontrar imagen en enclosure/media
        const media =
          n.enclosure?.url ||
          n.media?.url ||
          n.media?.content?.url ||
          n.image ||
          "";
        const imagen = media ? proxifyMedia(media) : "";

        return normalizeNoticia({
          titulo,
          resumen,
          url: enlace,
          fecha,
          imagen,
          fuente: "SUNARP",
          tipo: "juridica",
          especialidad: "registral",
          lang: "es",
        });
      });

      // filtros locales
      items = applySince(items, since);
      items = applyQ(items, q);

      // orden descendente por fecha
      items.sort((a, b) => new Date(b.fecha || 0) - new Date(a.fecha || 0));

      // limita a max
      return items.slice(0, Math.max(1, Math.min(50, Number(max) || 10)));
    } catch (err) {
      // intenta siguiente feed
      console.warn("SUNARP provider feed falló:", url, err?.message || err);
    }
  }

  return [];
}

export default fetchNoticias;
