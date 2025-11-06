import axios from "axios";
import { normalizeNoticia } from "./normalizer.js";

// ============================================================
// 🦉 BúhoLex | gnewsProvider
// API: https://gnews.io/ (v4 search)
// Parámetros soportados:
//   - apiKey | token : credencial (requerida)
//   - limit          : máximo de ítems (default 12, máx recomendado 50)
//   - q              : query (default temática derecho/política/economía/tech)
//   - lang           : 'es' por defecto
//   - since          : Date | number(ms) | ISO (filtrado por fecha >= since)
//   - tipo           : etiqueta del proyecto (default 'general')
// Notas:
//   - GNews usa 'token' como nombre de parámetro, pero aceptamos 'apiKey'.
//   - Manejo básico de 429 (rate limit).
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
  'derecho OR tribunal OR "corte suprema" OR jurisprudencia OR política OR economía OR tecnología';

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

  out.sort((a, b) => (new Date(b.fecha || 0)) - (new Date(a.fecha || 0)));
  return out.slice(0, Math.max(1, limit || 12));
}

export default async function fetchGNews(opts = {}) {
  const {
    apiKey = process.env.GNEWS_API_KEY || process.env.GNEWS_TOKEN || "",
    token, // alias adicional
    limit = 12,
    q = DEFAULT_Q,
    lang = "es",
    since = null,
    tipo = "general",
  } = opts;

  // preferimos apiKey, pero si viene token lo usamos
  const key = apiKey || token || "";
  if (!key || key.length < 8) {
    console.warn("⚠️ gnewsProvider: API key/token inválido o no configurado.");
    return [];
  }

  const qParam = encodeURIComponent(clean(q));
  const url = `https://gnews.io/api/v4/search?q=${qParam}&lang=${encodeURIComponent(
    lang
  )}&max=${encodeURIComponent(Math.min(50, Math.max(1, limit)))}&apikey=${encodeURIComponent(
    key
  )}`;

  try {
    const { data } = await http.get(url);
    const arts = data?.articles || [];
    const items = arts
      .filter((a) => a && (a.title || a.description) && a.url)
      .map((a) =>
        normalizeNoticia({
          titulo: clean(a.title || ""),
          resumen: clean(a.description || ""),
          url: a.url,
          fecha: a.publishedAt ? new Date(a.publishedAt) : new Date(),
          imagen: a.image || null,
          fuente: clean(a.source?.name || "GNews"),
          tipo,
        })
      );

    return applyFilters(items, { since, limit });
  } catch (e) {
    const code = e?.response?.status;
    if (code === 429) {
      console.warn("⏳ gnewsProvider: rate limit (429).");
    } else if (code === 401 || code === 403) {
      console.warn("⚠️ gnewsProvider: credencial inválida o plan insuficiente.", code);
    } else {
      console.warn("❌ gnewsProvider:", code || e?.message || e);
    }
    return [];
  }
}
