// backend/services/noticiasService.js
import axios from "axios";
import * as cheerio from "cheerio";

// =========================
// Fuentes configuradas
// =========================
const FUENTES = {
  juridicas: [
    {
      nombre: "Poder Judicial",
      url: "https://www.pj.gob.pe/wps/wcm/connect/portalpjudicial/s_cnoticias/noticias/",
      extractor: (html) => {
        const $ = cheerio.load(html);
        return $(".noticia")
          .map((_, el) => {
            const titulo = $(el).find(".titulo").text().trim();
            if (!titulo) return null;
            return {
              titulo,
              resumen: $(el).find(".descripcion").text().trim(),
              enlace: (() => {
                const href = $(el).find("a").attr("href") || "";
                return href.startsWith("http") ? href : `https://www.pj.gob.pe${href}`;
              })(),
              fecha: $(el).find(".fecha").text().trim() || new Date().toISOString(),
              fuente: "Poder Judicial",
              scope: "juridicas",
            };
          })
          .get()
          .filter(Boolean);
      },
    },
  ],
  generales: [
    {
      nombre: "ONU Noticias",
      url: "https://news.un.org/es/news/topic/law-and-crime-prevention",
      extractor: (html) => {
        const $ = cheerio.load(html);
        return $(".views-row")
          .map((_, el) => {
            const titulo = $(el).find(".field-content h2 a").text().trim();
            if (!titulo) return null;
            return {
              titulo,
              resumen: $(el).find(".field-content .teaser__text").text().trim(),
              enlace: (() => {
                const href = $(el).find(".field-content h2 a").attr("href") || "";
                return href.startsWith("http") ? href : `https://news.un.org${href}`;
              })(),
              fecha:
                $(el).find(".date-display-single").attr("content") ||
                new Date().toISOString(),
              fuente: "ONU Noticias",
              scope: "generales",
            };
          })
          .get()
          .filter(Boolean);
      },
    },
  ],
};

// =========================
// Servicio principal
// =========================
export async function actualizarNoticias({ scope = "juridicas", especialidad } = {}) {
  if (!["juridicas", "generales"].includes(scope)) {
    throw new Error(`Scope inválido: ${scope}`);
  }

  const fuentes = FUENTES[scope] || [];
  let total = 0;
  const porFuente = {};
  const errores = {};
  let itemsFinal = [];

  for (const fuente of fuentes) {
    try {
      const { data: html } = await axios.get(fuente.url, {
        timeout: 20000,
        headers: { "User-Agent": "Mozilla/5.0 (NoticiasBot)" },
      });

      let items = fuente.extractor(html) || [];

      // Filtro opcional por especialidad
      if (especialidad) {
        const kw = especialidad.toLowerCase();
        items = items.filter(
          (n) =>
            (n.titulo || "").toLowerCase().includes(kw) ||
            (n.resumen || "").toLowerCase().includes(kw)
        );
      }

      total += items.length;
      porFuente[fuente.nombre] = items.length;
      itemsFinal.push(...items);
    } catch (err) {
      console.error(`❌ [NoticiasService] Error al procesar fuente ${fuente.nombre}:`, err.message);
      errores[fuente.nombre] = err.message;
    }
  }

  return { ok: true, total, items: itemsFinal, porFuente, errores };
}
