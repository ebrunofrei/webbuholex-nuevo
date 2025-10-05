// src/services/noticiasApi.js

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000/api";

/**
 * getNoticias({ tipo, page, limit, q, fechaDesde, fechaHasta, ids })
 * Cliente HTTP para /api/noticias
 */
export async function getNoticias({
  tipo,
  page = 1,
  limit = 12,
  q,
  fechaDesde,
  fechaHasta,
  ids = []
} = {}) {
  const params = new URLSearchParams();
  if (tipo) params.set("tipo", tipo);
  if (page) params.set("page", page);
  if (limit) params.set("limit", limit);
  if (q) params.set("q", q);
  if (fechaDesde) params.set("fechaDesde", fechaDesde);
  if (fechaHasta) params.set("fechaHasta", fechaHasta);

  const res = await fetch(`${BASE_URL}/noticias?${params.toString()}`);
  if (!res.ok) throw new Error(`Error al obtener noticias: ${res.status}`);

  const data = await res.json(); // { page, limit, total, totalPages, items }

  // Filtrado local por ids (ej. guardadas)
  if (ids?.length) {
    data.items = data.items.filter(n => ids.includes(n._id));
  }

  return data;
}
