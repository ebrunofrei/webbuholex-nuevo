import { fetchRSS } from "./_helpers.js";
import { normalizeNoticia } from "./normalizer.js";

export async function fetchSUNARP({ max = 10 } = {}) {
  const rss = "https://www.sunarp.gob.pe/rss/noticias.xml";
  try {
    const items = await fetchRSS(rss, max);
    return items.map(n => normalizeNoticia({
      ...n,
      fuente: "SUNARP",
      tipo: "juridica",
      especialidad: "registral",
    }));
  } catch (err) {
    console.error("❌ Error fetchSUNARP:", err.message);
    return [];
  }
}
