import axios from "axios";
import { normalizeNoticia } from "./normalizer.js";

export async function fetchNewsAPI({ apiKey, max = 20 } = {}) {
  if (!apiKey || apiKey.length < 8) {
    console.warn("⚠️ NewsAPI omitido: API key inválida o no configurada.");
    return [];
  }
  const q = encodeURIComponent("Perú derecho OR tribunal OR corte suprema OR jurisprudencia OR política OR economía OR tecnología");
  const url = `https://newsapi.org/v2/top-headlines?q=${q}&language=es&pageSize=${max}&apiKey=${apiKey}`;
  try {
    const { data } = await axios.get(url, { timeout: 20000 });
    const arts = data?.articles || [];
    return arts.map(a =>
      normalizeNoticia({
        titulo: a.title,
        resumen: a.description || "",
        url: a.url,
        fecha: a.publishedAt,
        imagen: a.urlToImage,
        fuente: a.source?.name || "NewsAPI",
        tipo: "general",
      })
    );
  } catch (e) {
    console.error("❌ NewsAPI:", e.response?.status || e.message);
    return [];
  }
}
