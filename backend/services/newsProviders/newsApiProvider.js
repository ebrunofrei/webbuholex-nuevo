import axios from "axios";
import { normalizeNoticia } from "./normalizer.js";

// ============================================================
// 🦉 BúhoLex | newsApiProvider
// Fuente: https://newsapi.org (endpoint v2)
// Soporta:
//   - apiKey   : string (requerida)
//   - limit    : número máximo de ítems (default 12)
//   - q        : query libre (default temática Perú/derecho/política/etc.)
//   - lang     : 'es' por defecto
//   - since    : Date | number(ms) | ISO string (filtra por fecha >= since)
// Notas:
//   - NewsAPI limita dominios y tiene rate limit (429).
//   - Devuelve array normalizado (items).
// ============================================================

const http = axios.create({
  timeout: 20000,
  headers: {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
      "(KHTML, like Gecko) Chrome/120.0 Safari/537.36",
    Accept: "application/json",
  },
});

const DEFAULT_Q =
  'Perú AND (derecho OR tribunal OR "corte suprema" OR jurisprudencia OR política OR economía OR tecnología)';

const clean = (s = "") =>
  String(s).replace(/\s+/g, " ").replace(/\u00a0/g, " ").trim();

const toDate = (v) => {
  if (!v) return null;
  try {
    const d = new Date(v);
    return isNaN(+d) ? null : d;
  } catch {
    return null;
  }
};

function applyFilters(items, { since, limit }) {
  let out = Array.isArray(items) ? items : [];

  if (since) {
    const d =
      since instanceof Date
        ? since
        : typeof since === "number"
        ? new Date(since)
        : new Date(String(since));
    if (!isNaN(+d)) {
      out = out.filter((n) => {
        const nf = toDate(n.fecha);
        return nf ? nf >= d : true;
      });
    }
  }

  // Orden desc por fecha si existe
  out.sort((a, b) => (new Date(b.fecha || 0)) - (new Date(a.fecha || 0)));
  return out.slice(0, Math.max(1, limit || 12));
}

export default async function fetchNewsAPI(opts = {}) {
  const {
    apiKey = process.env.NEWSAPI_KEY || process.env.NEWS_API_KEY || "",
    limit = 12,
    q = DEFAULT_Q,
    lang = "es",
    since = null,
  } = opts;

  if (!apiKey || apiKey.length < 8) {
    console.warn("⚠️ newsApiProvider: API key inválida o no configurada.");
    return [];
  }

  // NewsAPI sólo permite ciertos operadores. Simplificamos para el endpoint.
  const qParam = encodeURIComponent(clean(q));

  // Usamos top-headlines; si falla, probamos everything
  const urls = [
    `https://newsapi.org/v2/top-headlines?language=${encodeURIComponent(
      lang
    )}&q=${qParam}&pageSize=${encodeURIComponent(
      Math.min(100, Math.max(1, limit))
    )}&apiKey=${encodeURIComponent(apiKey)}`,
    `https://newsapi.org/v2/everything?language=${encodeURIComponent(
      lang
    )}&q=${qParam}&sortBy=publishedAt&pageSize=${encodeURIComponent(
      Math.min(100, Math.max(1, limit))
    )}&apiKey=${encodeURIComponent(apiKey)}`,
  ];

  for (const url of urls) {
    try {
      const { data } = await http.get(url);
      if (!data || !Array.isArray(data.articles)) continue;

      const items = data.articles
        .filter((a) => a && (a.title || a.description) && a.url)
        .map((a) =>
          normalizeNoticia({
            titulo: clean(a.title || ""),
            resumen: clean(a.description || ""),
            url: a.url,
            fecha: a.publishedAt ? new Date(a.publishedAt) : new Date(),
            imagen: a.urlToImage || null,
            fuente: clean(a.source?.name || "NewsAPI"),
            tipo: "general",
          })
        );

      return applyFilters(items, { since, limit });
    } catch (e) {
      const code = e?.response?.status;
      if (code === 429) {
        console.warn("⏳ newsApiProvider: rate limit (429).");
      } else if (code === 426) {
        console.warn("⚠️ newsApiProvider: plan/upgrade requerido (426).");
      } else {
        console.warn("❌ newsApiProvider:", code || e?.message || e);
      }
      // Intenta siguiente URL del fallback loop
    }
  }

  return [];
}
