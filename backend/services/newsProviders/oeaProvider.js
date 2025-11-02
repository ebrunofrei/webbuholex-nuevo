import { fetchHTML, absUrl, normalizeText, toISODate, proxifyMedia } from "./_helpers.js";
import { normalizeNoticia } from "./normalizer.js";

export async function fetchOEA({ max = 10 } = {}) {
  const feeds = [
    "https://www.oas.org/es/rss.xml",
    "https://www.oas.org/es/centro_prensa/rssfeed.asp", // alterno clÃ¡sico
  ];
  for (const f of feeds) {
    try {
      const items = await fetchRSS(f);
      if (items.length) {
        return items.slice(0, max).map(n => normalizeNoticia({ ...n, fuente: "OEA", tipo: "juridica" }));
      }
    } catch {}
  }
  return [];
}
