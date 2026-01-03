// backend/services/fuentesLegalesService.js
// ============================================================
// Servicio de consulta de fuentes_legales (Mongo)
//  - usado por LitisBot para modo "buholex"
// ============================================================

import FuenteLegal from "../models/FuenteLegal.js";

/**
 * Convierte texto libre en un pequeño set de palabras clave.
 * (Muy simple: se puede mejorar después con embeddings, etc.)
 */
function extraerKeywordsBasicas(texto = "") {
  if (!texto || typeof texto !== "string") return [];

  return texto
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 4)
    .slice(0, 8);
}

/**
 * Búsqueda directa con filtros.
 */
export async function buscarFuentesLegales({
  tipo,
  relevancia,
  tagsAI = [],
  jurisdiccion,
  materia,
  limit = 10,
} = {}) {
  const query = {};

  if (tipo) query.tipo = tipo;
  if (relevancia) query.relevancia = relevancia;
  if (jurisdiccion) query.jurisdiccion = jurisdiccion;
  if (materia) query.materia = materia;

  // tagsAI: usamos $in para cualquier coincidencia
  if (Array.isArray(tagsAI) && tagsAI.length) {
    query.tagsAI = { $in: tagsAI };
  }

  const docs = await FuenteLegal.find(query)
    .sort({ fechaRegistro: -1 })
    .limit(Number(limit) || 10)
    .lean()
    .exec();

  return docs;
}

/**
 * Búsqueda "inteligente" a partir del prompt.
 * Se usa dentro de /api/ia/chat cuando toolMode == "buholex".
 */
export async function buscarFuentesLegalesRelevantesParaPrompt({
  texto,
  tipoPreferido = "jurisprudencia",
  relevanciaMinima = "media",
  materia,
  limit = 5,
} = {}) {
  const tagsAI = extraerKeywordsBasicas(texto);

  const prioridad = ["alta", "media", "baja"];
  const idxMin = prioridad.indexOf(relevanciaMinima);
  const relevanciasPermitidas =
    idxMin >= 0 ? prioridad.slice(0, idxMin + 1) : prioridad;

  // Primer intento: con filtros completos
  const query = {
    tipo: tipoPreferido,
    relevancia: { $in: relevanciasPermitidas },
  };

  if (materia) query.materia = materia;
  if (tagsAI.length) query.tagsAI = { $in: tagsAI };

  let docs = await FuenteLegal.find(query)
    .sort({ fechaRegistro: -1 })
    .limit(Number(limit) || 5)
    .lean()
    .exec();

  // Si viene muy poco, relajamos filtros
  if (docs.length < Math.min(3, limit)) {
    const queryRelax = {
      tipo: tipoPreferido,
    };
    if (tagsAI.length) queryRelax.tagsAI = { $in: tagsAI };

    docs = await FuenteLegal.find(queryRelax)
      .sort({ fechaRegistro: -1 })
      .limit(Number(limit) || 5)
      .lean()
      .exec();
  }

  return docs;
}
