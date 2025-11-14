// src/services/jurisprudenciaClient.js
// ============================================================
// 🦉 BúhoLex | Cliente de Jurisprudencia (frontend)
// - searchJurisprudencia: llama a GET /api/jurisprudencia
// - Normaliza respuesta a { items, total, page, pageSize }
// ============================================================

import { apiFetch } from "@/services/apiBase"; // usamos tu helper blindado

export async function searchJurisprudencia({
  q,
  organo,
  estado,
  materia,
  page = 1,
  pageSize = 10,
} = {}) {
  const params = new URLSearchParams();

  if (q) params.set("q", q);
  if (organo && organo !== "todos") params.set("organo", organo);
  if (estado && estado !== "todos") params.set("estado", estado);
  if (materia && materia !== "todas") params.set("materia", materia);
  params.set("page", String(page));
  params.set("pageSize", String(pageSize));

  const queryString = params.toString();
  const path = `/api/jurisprudencia${queryString ? `?${queryString}` : ""}`;

  const json = await apiFetch(path, {
    method: "GET",
    timeoutMs: 20000,
  });

  // Intento de normalización mínima
  const items =
    Array.isArray(json.items) ? json.items :
    Array.isArray(json.data) ? json.data :
    Array.isArray(json.results) ? json.results :
    [];

  return {
    items,
    total: json.total ?? items.length,
    page: json.page ?? page,
    pageSize: json.pageSize ?? pageSize,
  };
}
