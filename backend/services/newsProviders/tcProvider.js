import * as cheerio from "cheerio";
import { fetchHTML, absUrl, normalizeText, toISODate, proxifyMedia } from "./_helpers.js";
import { normalizeNoticia } from "./normalizer.js";

export async function fetchTC({ max = 10 } = {}) {
  const base = "https://www.tc.gob.pe";
  const url = `${base}/noticias_tc/`;
  const noticias = [];

  try {
    const html = await fetchHTML(url);
    const $ = cheerio.load(html);

    $("article, .post").slice(0, max).each((_, el) => {
      const a = $(el).find("a").first();
      const titulo = a.text().trim();
      const enlace = absUrl(a.attr("href"), base);
      const resumen = $(el).find("p").text().trim();
      const fecha = $(el).find("time").text().trim();
      const img = absUrl($(el).find("img").attr("src"), base);

      if (titulo && enlace) {
        noticias.push(normalizeNoticia({
          titulo,
          resumen,
          url: enlace,
          imagen: img,
          fuente: "Tribunal Constitucional",
          tipo: "juridica",
          especialidad: "constitucional",
          fecha,
        }));
      }
    });

    console.log(`ðŸ“˜ TC: ${noticias.length} noticias obtenidas`);
    return noticias;
  } catch (e) {
    console.error("âŒ Error en fetchTC:", e.message);
    return [];
  }
}
