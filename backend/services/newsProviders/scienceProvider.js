import {
  fetchRSS,           // <-- asegúrate que exista en _helpers.js
  absUrl,
  normalizeText,
  toISODate,
  proxifyMedia,
} from "./_helpers.js";
import { normalizeNoticia } from "./normalizer.js";

// ============================================================
// 🦉 BúhoLex | scienceProvider (ScienceDaily RSS)
// Feeds:
//  - Top Science
//  - AI (Computers & Math / Artificial Intelligence)
// Parámetros soportados:
//  - limit : máx de ítems (default 12)
//  - since : Date | ms | ISO (filtra por fecha >= since)
//  - q     : string (filtra por texto en título/resumen)
//  - lang  : ignorado (contenidos en EN); se mantiene por coherencia
//  - tipo  : etiqueta del proyecto (default 'general')
//  - especialidad : etiqueta (default 'tecnologia')
// ============================================================

const FEEDS = [
  "https://www.sciencedaily.com/rss/top/science.xml",
  "https://www.sciencedaily.com/rss/computers_math/artificial_intelligence.xml",
];

const clean = (s = "") =>
  normalizeText ? normalizeText(String(s)) : String(s).replace(/\s+/g, " ").trim();

const toDate = (v) => {
  if (!v) return null;
  try {
    const d = new Date(v);
    return isNaN(+d) ? null : d;
  } catch {
    return null;
  }
};

function applyFilters(items, { since, q, limit }) {
  let out = Array.isArray(items) ? items : [];

  if (since) {
    const d =
      since instanceof Date
        ? since
        : typeof since === "number"
        ? new Date(since)
        : new Date(String(since));
    if (!isNaN(+d)) {
      out = out.filter((n) => {
        const nf = toDate(n.fecha);
        return nf ? nf >= d : true;
      });
    }
  }

  if (q && q.trim()) {
    const needle = clean(q).toLowerCase();
    out = out.filter((n) =>
      `${n.titulo || ""} ${n.resumen || ""}`.toLowerCase().includes(needle)
    );
  }

  // Orden por fecha desc
  out.sort((a, b) => (new Date(b.fecha || 0)) - (new Date(a.fecha || 0)));
  return out.slice(0, Math.max(1, limit || 12));
}

export default async function fetchScienceNews(opts = {}) {
  const {
    limit = 12,
    since = null,
    q = null,
    lang = "es", // mantenido por coherencia de interfaz
    tipo = "general",
    especialidad = "tecnologia",
  } = opts;

  const all = [];

  for (const feed of FEEDS) {
    try {
      // fetchRSS debe devolver array de ítems del feed (según tu helper)
      const rssItems = await fetchRSS(feed);
      if (!Array.isArray(rssItems) || !rssItems.length) continue;

      for (const it of rssItems) {
        // Campos defensivos desde RSS
        const titulo =
          clean(it.title || it.titulo || it.headline || "");
        const resumen =
          clean(
            it.description ||
              it.summary ||
              it.resumen ||
              it.content ||
              ""
          );
        const url =
          it.link || it.url || it.enlace || null;

        // Fecha
        const fechaRaw =
          it.pubDate ||
          it.published ||
          it.date ||
          it.fecha ||
          (it.updated || null);
        const fecha =
          toDate(fechaRaw) || // intenta parse directo
          (toISODate ? toISODate(fechaRaw) : null) ||
          new Date();

        // Imagen (si tu fetchRSS ya extrae media:content, úsala)
        const imagenRaw =
          it.image ||
          it.enclosure?.url ||
          it.media?.content?.url ||
          it.media?.thumbnail?.url ||
          null;
        const imagen = proxifyMedia
          ? proxifyMedia(imagenRaw)
          : imagenRaw;

        if (!url || !titulo) continue;

        all.push(
          normalizeNoticia({
            titulo,
            resumen,
            url,
            fecha,
            imagen,
            fuente: "ScienceDaily",
            tipo,
            especialidad,
          })
        );
      }
    } catch (e) {
      // Si un feed falla, seguimos con los demás
      console.warn("scienceProvider feed error:", e?.message || e);
    }
  }

  return applyFilters(all, { since, q, limit });
}
