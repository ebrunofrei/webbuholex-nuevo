import { fetchHTML, absUrl, normalizeText, toISODate, proxifyMedia } from "./_helpers.js";
import * as cheerio from "cheerio";
import { normalizeNoticia } from "./normalizer.js";

export async function fetchCorteIDH({ max = 10 } = {}) {
  const base = "https://www.corteidh.or.cr";
  const url = `${base}/cf/jurisprudencia.cfm`;
  const noticias = [];

  try {
    const html = await fetchHTML(url);
    const $ = cheerio.load(html);

    $("a[href*='corteidh.or.cr/docs']").slice(0, max).each((_, el) => {
      const titulo = $(el).text().trim();
      const enlace = absUrl($(el).attr("href"), base);
      if (titulo && enlace) {
        noticias.push(normalizeNoticia({
          titulo,
          resumen: "Documento jurÃ­dico / fallo reciente",
          url: enlace,
          fuente: "Corte IDH",
          tipo: "juridica",
          especialidad: "derechos humanos",
        }));
      }
    });

    console.log(`âš–ï¸ Corte IDH: ${noticias.length} documentos detectados`);
    return noticias;
  } catch (err) {
    console.error("âŒ Error fetchCorteIDH:", err.message);
    return [];
  }
}
