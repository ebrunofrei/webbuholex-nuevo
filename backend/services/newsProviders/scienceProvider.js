import { fetchHTML, absUrl, normalizeText, toISODate, proxifyMedia } from "./_helpers.js";
import { normalizeNoticia } from "./normalizer.js";

export async function fetchScienceNews({ max = 10 } = {}) {
  const feeds = [
    "https://www.sciencedaily.com/rss/top/science.xml",
    "https://www.sciencedaily.com/rss/computers_math/artificial_intelligence.xml",
  ];
  for (const f of feeds) {
    try {
      const items = await fetchRSS(f);
      if (items.length) {
        return items.slice(0, max).map(n => normalizeNoticia({ ...n, fuente: "ScienceDaily", tipo: "general", especialidad: "tecnologia" }));
      }
    } catch {}
  }
  return [];
}
