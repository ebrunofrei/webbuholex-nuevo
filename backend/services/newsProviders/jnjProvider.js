import * as cheerio from "cheerio";
import { fetchHTML, absUrl, normalizeText, toISODate, proxifyMedia } from "./_helpers.js";
import { normalizeNoticia } from "./normalizer.js";

export async function fetchJNJ({ max = 10 } = {}) {
  const bases = ["https://www.jnj.gob.pe", "https://jnj.gob.pe"];
  try {
    const html = await fetchHTML(bases.map(b => `${b}/noticias/`));
    const base = bases.find(b => html.includes(b.split("//")[1])) || bases[0];

    const $ = cheerio.load(html);
    const out = [];

    $(".noticia, article, .news-item, .post").slice(0, max).each((_, el) => {
      const a = $(el).find("a").first();
      const titulo = ($(el).find("h3, h2").first().text() || a.text()).trim();
      const url = absUrl(a.attr("href"), base);
      const resumen = $(el).find("p").first().text().trim();
      const img = absUrl($(el).find("img").attr("src"), base);
      if (titulo && url) out.push(normalizeNoticia({ titulo, resumen, url, imagen: img, fuente: "JNJ", tipo: "juridica" }));
    });

    return out;
  } catch (e) {
    console.error("âŒ JNJ:", e.message);
    return [];
  }
}
