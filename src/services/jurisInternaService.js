// src/services/jurisInternaService.js
// ============================================================
// 🦉 BúhoLex | Cliente API Repositorio Interno de Jurisprudencia
// - Búsqueda clásica por filtros
// - Búsqueda "inteligente" usando el mismo endpoint con q
// ============================================================

import { joinApi } from "@/services/apiBase";

/**
 * Mapea el tag del frontend al "tipo" que entiende el backend.
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

async function fetchJurisprudencia({ q, materia, organo, estado, tag, limit, signal } = {}) {
  const params = new URLSearchParams();

  if (q && q.trim()) params.set("q", q.trim());
  if (materia) params.set("materia", materia);
  if (organo) params.set("organo", organo);
  if (estado) params.set("estado", estado);

  const tipo = mapTagToTipo(tag || "todas");
  if (tipo && tipo !== "todas") {
    params.set("tipo", tipo);
  }

  if (limit) {
    params.set("limit", String(limit));
  }

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
    count: data.count || (Array.isArray(data.items) ? data.items.length : 0),
    items: data.items || [],
  };
}

// 🎯 Búsqueda clásica por filtros (sin q)
export async function buscarJurisprudenciaInterna({
  materia,
  organo,
  estado,
  tag,
  limit = 50,
  signal,
} = {}) {
  return fetchJurisprudencia({
    materia,
    organo,
    estado,
    tag,
    limit,
    signal,
  });
}

// 🤖 Búsqueda "IA" (por texto) → mismo endpoint con q
export async function buscarJurisprudenciaEmbed({
  q,
  limit = 20,
  tag = "todas",
  signal,
} = {}) {
  return fetchJurisprudencia({
    q,
    tag,
    limit,
    signal,
  });
}
