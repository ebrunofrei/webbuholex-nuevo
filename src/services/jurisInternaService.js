// src/services/jurisInternaService.js
// ============================================================
// 🦉 BúhoLex | Cliente API Repositorio Interno de Jurisprudencia
// - Búsqueda clásica por filtros
// - Búsqueda semántica (embeddings)
// ============================================================

import { joinApi } from "@/services/apiBase";

/**
 * Mapea el tag del frontend al "tipo" que entiende el backend.
 * TAGS frontend:
 *  - "todas"       → tipo = "todas"
 *  - "recientes"   → tipo = "recientes"
 *  - "mas_citadas" → tipo = "citadas"
 *  - "destacadas"  → tipo = "destacadas"
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

export async function buscarJurisprudenciaInterna({
  materia,
  organo,
  estado,
  tag,
  signal,
} = {}) {
  const params = new URLSearchParams();

  if (materia) params.set("materia", materia);
  if (organo) params.set("organo", organo);
  if (estado) params.set("estado", estado);

  // 🔁 En vez de mandar "tag", mandamos "tipo" como espera el backend
  const tipo = mapTagToTipo(tag || "todas");
  if (tipo && tipo !== "todas") {
    params.set("tipo", tipo);
  }

  const url = params.toString()
    ? `${joinApi("/jurisprudencia")}?${params.toString()}`
    : joinApi("/jurisprudencia");

  const resp = await fetch(url, { signal });

  if (!resp.ok) throw new Error(`Error interna ${resp.status}`);

  const data = await resp.json();
  return {
    ok: !!data.ok,
    count: data.count || 0,
    items: data.items || [],
  };
}

export async function buscarJurisprudenciaEmbed({ q, limit = 20, signal } = {}) {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (limit) params.set("limit", String(limit));

  const resp = await fetch(
    `${joinApi("/jurisprudencia/search-embed")}?${params.toString()}`,
    { signal }
  );

  if (!resp.ok) throw new Error(`Error embed ${resp.status}`);

  const data = await resp.json();
  return {
    ok: !!data.ok,
    count: data.count || 0,
    items: data.items || [],
  };
}
