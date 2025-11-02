import axios from "axios";
import { normalizeNoticia } from "./normalizer.js";

export async function fetchGNews({ apiKey, max = 20, tipo = "general" } = {}) {
  if (!apiKey || apiKey.length < 8) {
    console.warn("âš ï¸ GNews omitido: API key invÃ¡lida o no configurada.");
    return [];
  }
  const q = encodeURIComponent("derecho OR tribunal OR corte suprema OR jurisprudencia OR polÃ­tica OR economÃ­a OR tecnologÃ­a");
  const url = `https://gnews.io/api/v4/search?q=${q}&lang=es&max=${max}&apikey=${apiKey}`;
  try {
    const { data } = await axios.get(url, { timeout: 20000 });
    const arts = data?.articles || [];
    return arts.map(a =>
      normalizeNoticia({
        titulo: a.title,
        resumen: a.description || "",
        url: a.url,
        fecha: a.publishedAt,
        imagen: a.image,
        fuente: a.source?.name || "GNews",
        tipo,
      })
    );
  } catch (e) {
    console.error("âŒ GNews:", e.response?.status || e.message);
    return [];
  }
}
