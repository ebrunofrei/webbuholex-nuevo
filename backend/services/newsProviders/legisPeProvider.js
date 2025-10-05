import axios from "axios";
import * as cheerio from "cheerio";

/**
 * Clasificador de especialidad según keywords
 */
function detectEspecialidad(texto = "") {
  const lower = texto.toLowerCase();

  if (lower.includes("penal")) return "penal";
  if (lower.includes("civil")) return "civil";
  if (lower.includes("laboral")) return "laboral";
  if (lower.includes("constitucional")) return "constitucional";
  if (lower.includes("familiar")) return "familiar";
  if (lower.includes("administrativo")) return "administrativo";
  if (lower.includes("filosofía") || lower.includes("filosofia")) return "filosofia";
  if (lower.includes("sociología") || lower.includes("sociologia")) return "sociologia";
  if (lower.includes("política") || lower.includes("politica")) return "politica";

  return "general";
}

/**
 * Scraping de noticias desde Legis.pe
 * @param {Object} opts
 * @param {number} opts.max - máximo de noticias
 */
export async function fetchLegisPe({ max = 20 } = {}) {
  const url = "https://legis.pe/categorias/noticias/";
  const results = [];

  try {
    const { data: html } = await axios.get(url, { timeout: 15000 });
    const $ = cheerio.load(html);

    $(".jeg_post").slice(0, max).each((i, el) => {
      const titulo = $(el).find(".jeg_post_title a").text().trim();
      const enlace = $(el).find(".jeg_post_title a").attr("href");
      const resumen = $(el).find(".jeg_post_excerpt").text().trim();
      const fechaRaw = $(el).find("time").attr("datetime");
      const fecha = fechaRaw ? new Date(fechaRaw) : new Date();
      const imagen = $(el).find("img").attr("data-src") || $(el).find("img").attr("src");

      results.push({
        id: enlace,
        titulo,
        resumen,
        contenido: "",
        fuente: "Legis.pe",
        url: enlace,
        imagen,
        fecha,
        tipo: "juridica",
        especialidad: detectEspecialidad(`${titulo} ${resumen}`),
      });
    });
  } catch (err) {
    console.error("❌ Error en fetchLegisPe:", err.message);
  }

  return results;
}
