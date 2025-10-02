// src/services/newsApi.js
/**
 * Servicio para consumir noticias desde backend
 * 
 * API:
 *   /api/noticias?tipo=general|juridicas&page=1&pageSize=8
 */

const BASE_URL = import.meta.env.VITE_NEWS_API_URL || "/api/noticias";

/**
 * Obtener noticias desde el backend
 * @param {string} tipo - "general" o "juridicas"
 * @param {number} page - página (empieza en 1)
 * @param {number} pageSize - cantidad de resultados
 * @returns {Promise<{ok:boolean, items:Array, total:number, hasMore:boolean}>}
 */
export async function getNoticias(tipo = "general", page = 1, pageSize = 8) {
  try {
    const url = `${BASE_URL}?tipo=${encodeURIComponent(tipo)}&page=${page}&pageSize=${pageSize}`;
    const res = await fetch(url);

    if (!res.ok) throw new Error(`Error HTTP ${res.status}`);

    const data = await res.json();

    // Normalización segura
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
