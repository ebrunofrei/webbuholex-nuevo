import * as cheerio from "cheerio";
import { tryFetchHTML, absUrl } from "./_helpers.js";
import { normalizeNoticia } from "./normalizer.js";

export async function fetchTJUE({ max = 10 } = {}) {
  const base = "https://curia.europa.eu";
  const urls = [
    `${base}/jcms/jcms/Jo2_7060/es/`,   // sala de prensa
    `${base}/jcms/jcms/P_95680/es/`,    // noticias (alterno)
  ];
  try {
    const html = await tryFetchHTML(urls);
    const $ = cheerio.load(html);
    const out = [];

    $(".actualites .article, .news-item, article").slice(0, max).each((_, el) => {
      const a = $(el).find("h3 a, h2 a, a").first();
      const titulo = a.text().trim();
      const url = absUrl(a.attr("href"), base);
      const resumen = $(el).find("p").first().text().trim();
      const img = absUrl($(el).find("img").attr("src"), base);
      const fecha = $(el).find(".date, time").first().text().trim();
      if (titulo && url) out.push(normalizeNoticia({ titulo, resumen, url, imagen: img, fecha, fuente: "TJUE", tipo: "juridica" }));
    });

    return out;
  } catch (e) {
    console.error("❌ TJUE:", e.message);
    return [];
  }
}
