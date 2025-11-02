import axios from "axios";
import * as cheerio from "cheerio";

/**
 * Scraper de WeLiveSecurity (ESET) https://www.welivesecurity.com/es
 * Temas: ciberseguridad
 */
export async function fetchCyberNews({ max = 15 } = {}) {
  const url = "https://www.welivesecurity.com/es/";
  const results = [];

  try {
    const { data: html } = await axios.get(url, { timeout: 15000 });
    const $ = cheerio.load(html);

    $(".article").slice(0, max).each((i, el) => {
      const titulo = $(el).find("h2 a").text().trim();
      const enlace = $(el).find("h2 a").attr("href");
      const resumen = $(el).find("p").text().trim();
      const imagen = $(el).find("img").attr("src");
      const fechaRaw = $(el).find("time").attr("datetime");
      const fecha = fechaRaw ? new Date(fechaRaw) : new Date();

      results.push({
        id: enlace,
        titulo,
        resumen,
        contenido: "",
        fuente: "WeLiveSecurity",
        url: enlace,
        imagen,
        fecha,
        tipo: "general",
        especialidad: "ciberseguridad",
      });
    });
  } catch (err) {
    console.error("âŒ Error en fetchCyberNews:", err.message);
  }

  return results;
}
