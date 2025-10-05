import axios from "axios";
import { normalizeNoticia } from "./normalizer.js";

export async function fetchGNews({ apiKey, max = 20, tipo = "general" } = {}) {
  if (!apiKey || apiKey.length < 8) {
    console.warn("⚠️ GNews omitido: API key inválida o no configurada.");
    return [];
  }
  const q = encodeURIComponent("derecho OR tribunal OR corte suprema OR jurisprudencia OR política OR economía OR tecnología");
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
    console.error("❌ GNews:", e.response?.status || e.message);
    return [];
  }
}
