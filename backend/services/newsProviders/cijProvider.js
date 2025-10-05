import * as cheerio from "cheerio";
import { tryFetchHTML, absUrl } from "./_helpers.js";
import { normalizeNoticia } from "./normalizer.js";

export async function fetchCIJ({ max = 10 } = {}) {
  const base = "https://www.icj-cij.org";
  const candidates = [
    `${base}/news`,
    `${base}/press-releases`,
    `${base}/home`,
  ];
  try {
    const html = await tryFetchHTML(candidates);
    const $ = cheerio.load(html);
    const out = [];

    $("article, .views-row, .news-item").slice(0, max).each((_, el) => {
      const a = $(el).find("h3 a, h2 a, a").first();
      const titulo = a.text().trim();
      const url = absUrl(a.attr("href"), base);
      const resumen = $(el).find("p").first().text().trim();
      const img = absUrl($(el).find("img").attr("src"), base);
      const fecha = $(el).find("time, .date").first().attr("datetime") || $(el).find("time, .date").first().text().trim();
      if (titulo && url) out.push(normalizeNoticia({ titulo, resumen, url, imagen: img, fecha, fuente: "CIJ", tipo: "juridica" }));
    });

    return out;
  } catch (e) {
    console.error("❌ CIJ:", e.message);
    return [];
  }
}
