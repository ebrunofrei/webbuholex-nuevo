// src/services/newsApi.js
const BASE_URL = import.meta.env.VITE_NEWS_API_URL || "/api/noticias";

export async function getNoticias(tipo = "general", page = 1, pageSize = 8) {
  try {
    const url = `${BASE_URL}?tipo=${tipo}&page=${page}&pageSize=${pageSize}`;
    const res = await fetch(url);

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
