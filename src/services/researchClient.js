// src/services/researchClient.js
// ============================================================
// 🦉 BúhoLex | Cliente de Búsqueda (Google CSE vía backend)
// - Usa joinApi("/research/search") para no duplicar /api
// - apiFetch() hereda timeout, retries y AbortController
// ============================================================

import { joinApi, apiFetch } from "./apiBase";

/**
 * Busca jurisprudencia/noticias en el backend de research.
 * @param {Object} params
 * @param {string} params.q       - Consulta de búsqueda (obligatoria)
 * @param {number} [params.num]   - Máximo de resultados (default 3)
 * @param {string} [params.lang]  - Código de idioma/lr (default "es")
 * @param {number} [params.start] - Paginación CSE (1, 11, 21, ...)
 */
export async function buscarJurisprudencia(
  { q, num = 3, lang = "es", start } = {},
) {
  const query = String(q || "").trim();
  if (!query) {
    throw new Error("Falta el parámetro q (consulta).");
  }

  const n = Number.isFinite(num) ? num : 3;

  const url = new URL(joinApi("/research/search"));
  url.searchParams.set("q", query);
  url.searchParams.set("num", String(n));

  if (lang) {
    url.searchParams.set("lr", String(lang));
  }
  if (start != null) {
    url.searchParams.set("start", String(start));
  }

  let res;
  try {
    res = await apiFetch(url.toString(), {
      method: "GET",
      // CORS simple; sin cookies
      credentials: "omit",
      headers: { accept: "application/json" },
      // si quieres, podrías subir el timeout un poco aquí:
      // timeoutMs: 20_000,
    });
  } catch (err) {
    // Error de red / timeout
    throw new Error(`Error de red en búsqueda: ${err?.message || String(err)}`);
  }

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Research ${res.status}: ${txt || res.statusText}`);
  }

  return res.json();
}
