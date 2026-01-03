// src/services/researchClientService.js
// ============================================================
// 🦉 BúhoLex | Cliente de Research / Jurisprudencia (Google CSE)
// - Usa apiBase.js: joinApi + apiFetch
// - searchJurisprudencia(q, { start, num }) con paginación
// ============================================================

import { joinApi, apiFetch } from "@/services/apiBase";

/**
 * Llama al backend /api/research/health
 */
export async function checkResearchHealth(options = {}) {
  const url = joinApi("/research/health");

  const res = await apiFetch(url, {
    method: "GET",
    ...(options || {}),
  });

  if (!res.ok) {
    throw new Error(`Research health check failed: ${res.status}`);
  }

  const data = await res.json();
  return data; // { ok, enabled, hasKeys, msg, ... }
}

/**
 * Busca jurisprudencia / research en el backend
 * @param {string} q - Texto de búsqueda (casación, expediente, etc.)
 * @param {Object} opts - Opciones adicionales
 *   - signal: AbortSignal para cancelar peticiones
 *   - start: índice de inicio (1, 11, 21, ...)
 *   - num: cantidad de resultados por página (1..10, backend limita)
 */
export async function searchJurisprudencia(q, opts = {}) {
  const query = String(q || "").trim();

  if (!query) {
    return {
      ok: false,
      emptyQuery: true,
      count: 0,
      items: [],
      msg: "La consulta está vacía",
    };
  }

  const params = new URLSearchParams();
  params.set("q", query);

  if (opts.start) params.set("start", String(opts.start));
  if (opts.num) params.set("num", String(opts.num));

  const url = joinApi(`/research/search?${params.toString()}`);

  const res = await apiFetch(url, {
    method: "GET",
    signal: opts.signal,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Error en searchJurisprudencia: ${res.status} ${text || ""}`
    );
  }

  const data = await res.json();

  const items = Array.isArray(data.items) ? data.items : [];
  const count = Number(data.count || items.length || 0);
  const totalResults = Number(data.totalResults || 0) || count;
  const num = Number(data.num || opts.num || items.length || 0) || count;
  const start = Number(data.start || opts.start || 1) || 1;

  return {
    ok: Boolean(data.ok),
    q: data.q || query,
    count,
    items,
    totalResults,
    num,
    start,
    raw: data,
  };
}
