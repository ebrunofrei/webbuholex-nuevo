// src/services/jurisInternaService.js
// ============================================================
// 🦉 BúhoLex | Cliente API Repositorio Interno de Jurisprudencia
// - Filtros completos
// - Paginación real
// - Búsqueda por texto (q) con el mismo endpoint
// ============================================================

import { joinApi } from "@/services/apiBase";

/**
 * Mapea el tag del frontend al "tipo" del backend
 */
function mapTagToTipo(tag) {
  switch (tag) {
    case "recientes":
      return "recientes";
    case "mas_citadas":
      return "citadas";
    case "destacadas":
      return "destacadas";
    default:
      return "todas";
  }
}

/**
 * Cliente universal para /api/jurisprudencia
 */
async function fetchJurisprudencia({
  q,
  materia,
  organo,
  estado,
  tag,
  origen,
  anio,
  page,
  limit,
  signal,
} = {}) {
  const params = new URLSearchParams();

  if (q && q.trim()) params.set("q", q.trim());
  if (materia) params.set("materia", materia);
  if (organo) params.set("organo", organo);
  if (estado) params.set("estado", estado);

  const tipo = mapTagToTipo(tag);
  if (tipo && tipo !== "todas") {
    params.set("tipo", tipo);
  }

  if (anio) params.set("anio", String(anio));
  if (origen) params.set("origen", String(origen));

  if (page) params.set("page", String(page));
  if (limit) params.set("limit", String(limit));

  const qs = params.toString();
  const url = qs
    ? `${joinApi("/jurisprudencia")}?${qs}`
    : joinApi("/jurisprudencia");

  const resp = await fetch(url, { signal });

  if (!resp.ok) {
    throw new Error(`Error jurisprudencia ${resp.status}`);
  }

  const data = await resp.json();

  return {
    ok: !!data.ok,
    page: Number(data.page || page || 1),
    limit: Number(data.limit || limit || 20),
    count: Number(data.count || (Array.isArray(data.items) ? data.items.length : 0)),
    items: data.items || [],
  };
}

// 🎯 Búsqueda clásica por filtros (sin q)
export async function buscarJurisprudenciaInterna({
  materia,
  organo,
  estado,
  origen = "JNS",
  anio,
  tag = "todas",
  page = 1,
  limit = 20,
  signal,
} = {}) {
  return fetchJurisprudencia({
    materia,
    organo,
    estado,
    origen,
    anio,
    tag,
    page,
    limit,
    signal,
  });
}

// 🤖 Búsqueda "IA" (por texto q) → mismo endpoint
export async function buscarJurisprudenciaEmbed({
  q,
  origen = "JNS",
  anio,
  tag = "todas",
  page = 1,
  limit = 20,
  signal,
} = {}) {
  return fetchJurisprudencia({
    q,
    origen,
    anio,
    tag,
    page,
    limit,
    signal,
  });
}
