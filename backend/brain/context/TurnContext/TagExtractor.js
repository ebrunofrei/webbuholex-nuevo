// ============================================================================
// 🧠 TagExtractor.js — R7.6++ (2026)
// Clasificación semántica jerárquica:
// - dominio / objeto / proceso
// - Extrae también tags planos
// - Ultra rápido (usa RegExp precompiladas de Ontology.js)
// - No hace afinidad, no hace reset: SOLO clasifica.
// ============================================================================

import { ONTOLOGY } from "./Ontology.js";

// ------------------------------------------------------------
// 🔧 Sanitizador ligero (max performance)
// ------------------------------------------------------------
function normalize(text = "") {
  return String(text || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

// ------------------------------------------------------------
// 🧩 EXTRAER TAGS JERÁRQUICOS
// ------------------------------------------------------------
export function extractHierarchicalTags(text = "") {
  const t = normalize(text);

  const result = {
    dominio: [],
    objeto: [],
    proceso: [],
  };

  // Dominio
  for (const key in ONTOLOGY.dominio) {
    const pattern = ONTOLOGY.dominio[key];
    if (pattern.test(t)) result.dominio.push(key);
  }

  // Objeto jurídico
  for (const key in ONTOLOGY.objeto) {
    const pattern = ONTOLOGY.objeto[key];
    if (pattern.test(t)) result.objeto.push(key);
  }

  // Proceso
  for (const key in ONTOLOGY.proceso) {
    const pattern = ONTOLOGY.proceso[key];
    if (pattern.test(t)) result.proceso.push(key);
  }

  return result;
}

// ------------------------------------------------------------
// 🧩 EXTRAER TAGS PLANOS
// ------------------------------------------------------------
export function extractFlatTags(text = "") {
  const h = extractHierarchicalTags(text);
  return [...h.dominio, ...h.objeto, ...h.proceso];
}

// ------------------------------------------------------------
// 🧩 EXTRAER TAGS + MÉTRICA DE DENSIDAD (útil para LTM y análisis)
// ------------------------------------------------------------
export function extractTagsWithDensity(text = "") {
  const t = normalize(text);
  const h = extractHierarchicalTags(t);

  const wordCount = t.split(" ").length || 1;
  const tagCount =
    h.dominio.length + h.objeto.length + h.proceso.length;

  return {
    ...h,
    density: tagCount / wordCount, // qué tan cargado está el texto de términos jurídicos
  };
}

export default {
  extractHierarchicalTags,
  extractFlatTags,
  extractTagsWithDensity,
};
