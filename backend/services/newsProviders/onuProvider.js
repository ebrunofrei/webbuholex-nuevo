import { fetchRSS } from "./_helpers.js";
import { normalizeNoticia } from "./normalizer.js";

export async function fetchOnuNoticias({ max = 10 } = {}) {
  const rss = "https://news.un.org/feed/subscribe/es/news/topic/law-and-crime-prevention/feed/rss.xml";
  try {
    const items = await fetchRSS(rss, max);
    return items.map(n => normalizeNoticia({
      ...n,
      fuente: "ONU Noticias",
      tipo: "general",
      especialidad: "internacional",
    }));
  } catch (err) {
    console.error("❌ Error fetchOnuNoticias:", err.message);
    return [];
  }
}
