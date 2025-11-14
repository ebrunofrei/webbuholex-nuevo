// src/services/researchClientService.js
// ============================================================
// 🦉 BúhoLex | Cliente de Research / Jurisprudencia (Google CSE)
// - Usa apiBase.js: joinApi + apiFetch
// - searchJurisprudencia(q): devuelve { ok, items, count }
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
  return data; // { ok, msg, ... }
}

/**
 * Busca jurisprudencia / research en el backend
 * @param {string} q - Texto de búsqueda (casación, expediente, etc.)
 * @param {Object} opts - Opciones adicionales
 * @param {AbortSignal} opts.signal - Para cancelar peticiones previas
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

  const url = joinApi(
    `/research/search?q=${encodeURIComponent(query)}`
  );

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

  // Normalizamos un poco la respuesta por si el backend cambia
  return {
    ok: Boolean(data.ok),
    q: data.q || query,
    count: Number(data.count || (data.items ? data.items.length : 0)),
    items: Array.isArray(data.items) ? data.items : [],
    raw: data,
  };
}
