// ============================================================================
// 🧠 D3.6 — EPISTEMIC HUMILITY ENGINE (R2 ENTERPRISE)
// ----------------------------------------------------------------------------
// Propósito:
//   - Ajustar el alcance conclusivo cuando existan señales de insuficiencia.
//   - Evitar lenguaje débil o especulativo.
//   - Mantener autoridad jurídica sin incurrir en dogmatismo.
//
// Este módulo:
//   ❌ NO explica al usuario.
//   ❌ NO inventa hechos ni excepciones.
//   ❌ NO introduce advertencias genéricas.
//   ✅ Opera únicamente sobre estructuras internas (reasoning/conclusion).
// ============================================================================

/* ------------------------------------------------------------
   Helpers
------------------------------------------------------------ */
function safeStr(v = "") {
  return String(v || "").trim();
}

/* ------------------------------------------------------------
   HUMILITY TRIGGER
   Se activa solo cuando las premisas no están acreditadas o
   existe riesgo lógico en las inferencias.
------------------------------------------------------------ */
function needsHumility(context = {}, flags = {}) {
  return (
    context?.pruebaInsuficiente === true ||
    flags?.unprovenPremise === true ||
    flags?.weakAnalogy === true ||
    flags?.probabilityAsCertainty === true
  );
}

/* ------------------------------------------------------------
   PREÁMBULO DE HUMILDAD — sobrio, profesional, no repetitivo
------------------------------------------------------------ */
const HUMILITY_PREAMBLES = [
  "Con la información actualmente disponible,",
  "A partir de los elementos que constan en el análisis,",
  "Sin perjuicio de la acreditación probatoria completa,"
];

function addHumilityPreamble(text = "") {
  const p = HUMILITY_PREAMBLES[0]; // determinista para reproducibilidad R2
  return `${p} ${text}`;
}

/* ------------------------------------------------------------
   Depura expresiones débiles / coloquiales
------------------------------------------------------------ */
function normalizeStrength(text = "") {
  return text
    .replace(/\bno sé\b/gi, "")
    .replace(/\bquizás\b/gi, "")
    .replace(/\btal vez\b/gi, "")
    .replace(/\bpodría ser cualquier cosa\b/gi, "")
    .trim();
}

/* ------------------------------------------------------------
   MAIN API — applyEpistemicHumility
------------------------------------------------------------ */
export function applyEpistemicHumility({
  reasoning = "",
  conclusion = "",
  context = {},
  flags = {},
}) {
  let r = normalizeStrength(safeStr(reasoning));
  let c = normalizeStrength(safeStr(conclusion));

  // Se modula solo la conclusión, no el razonamiento completo.
  if (needsHumility(context, flags)) {
    c = addHumilityPreamble(c);
  }

  return {
    reasoning: r,
    conclusion: c,
  };
}

export default applyEpistemicHumility;
