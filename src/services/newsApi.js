// src/services/newsApi.js
const API_BASE = import.meta.env.VITE_API_BASE_URL || "/api";

/**
 * Obtiene noticias desde el backend unificado.
 * 
 * @param {string} tipo - "generales" | "juridicas"
 * @param {number} page - número de página (default 1)
 * @param {number} limit - tamaño de página (default 8)
 */
export async function getNoticias(tipo = "generales", page = 1, limit = 8) {
  try {
    const url = `${API_BASE}/noticias?tipo=${tipo}&page=${page}&limit=${limit}`;
    const res = await fetch(url, { headers: { "Content-Type": "application/json" } });

    if (!res.ok) throw new Error(`Error HTTP ${res.status}`);

    const data = await res.json();

    return {
      ok: data.ok ?? false,
      total: data.total ?? 0,
      items: Array.isArray(data.items) ? data.items : [],
      hasMore: data.hasMore ?? false,
    };
  } catch (err) {
    console.error("❌ Error getNoticias:", err);
    return { ok: false, total: 0, items: [], hasMore: false };
  }
}
