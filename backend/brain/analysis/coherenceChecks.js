// ============================================================================
// ⚖️ COHERENCE CHECKS – D3.5 (R2 ENTERPRISE)
// ----------------------------------------------------------------------------
// Microtests de consistencia interna.
//
// Objetivo:
//   - Detectar señales narrativas que inflan certeza o gravedad.
//   - NO decide, NO clasifica el caso. Solo indica tensiones lógicas.
//   - Compatible con computeCoherenceScore y el motor argumentativo R2.
//
// Salidas:
//   • flags: mapa booleano de señales
//   • tonedDown: si el texto fue suavizado
//   • reasoning / conclusion: versiones ajustadas
// ============================================================================

/* ------------------------------------------------------------
   Helpers
------------------------------------------------------------ */
function safeStr(v = "") {
  return String(v || "").trim();
}

function concat(...xs) {
  return xs.filter(Boolean).join(" ").trim().toLowerCase();
}

/* ------------------------------------------------------------
   Checks semánticos
------------------------------------------------------------ */

// 1) Premisas sin sustento
function hasUnprovenPremise(facts = [], ctx = {}) {
  return !facts?.length || ctx?.pruebaInsuficiente === true;
}

// 2) Afirmaciones excesivas (“overclaiming”)
function overclaims(text = "") {
  // Evita falsos positivos: detecta “es” solo como verbo copulativo
  return /\b(es|debe|corresponde)\b/i.test(text);
}

// 3) Probabilidad narrada como certeza
function probabilityAsCertainty(text = "") {
  return /\b(concluye|demuestra|queda acreditado)\b/i.test(text);
}

// 4) Analogía débil
function weakAnalogy(ctx = {}) {
  return ctx?.usaAnalogía === true && ctx?.identidadRelevante !== true;
}

// 5) Gravedad desproporcionada respecto al hecho
function disproportionateGravity(gravity = {}, ctx = {}) {
  if (!gravity?.label) return false;
  if (gravity.label === "nulidad" && ctx?.afectaDefensa !== true) return true;
  return false;
}

/* ------------------------------------------------------------
   Suavizador (rebaja automática)
------------------------------------------------------------ */

function soften(text = "") {
  return safeStr(
    text
      .replace(/\bes\b/gi, "resulta")
      .replace(/\bdebe\b/gi, "podría")
      .replace(/\bcorresponde\b/gi, "sería pertinente")
      .replace(/\bconcluye\b/gi, "sugiere")
      .replace(/\bdemuestra\b/gi, "indica")
      .replace(/\bqueda acreditado\b/gi, "podría considerarse acreditado")
  );
}

/* ------------------------------------------------------------
   API PRINCIPAL
------------------------------------------------------------ */

export function runCoherenceChecks({
  reasoning = "",
  conclusion = "",
  facts = [],
  gravity = {},
  context = {},
}) {
  const baseText = concat(reasoning, conclusion);

  const flags = {
    unprovenPremise: hasUnprovenPremise(facts, context),
    overclaims: overclaims(baseText),
    probabilityAsCertainty: probabilityAsCertainty(baseText),
    weakAnalogy: weakAnalogy(context),
    disproportionateGravity: disproportionateGravity(gravity, context),
  };

  const hasIssue = Object.values(flags).some(Boolean);

  if (!hasIssue) {
    return {
      reasoning: safeStr(reasoning),
      conclusion: safeStr(conclusion),
      flags,
      tonedDown: false,
    };
  }

  // ------------------------------------------------------------
  // Rebaja automática elegante (NO cambia el sentido lógico)
  // ------------------------------------------------------------
  const softenedReasoning = soften(reasoning);
  const softenedConclusion = safeStr(
    "Con la información disponible, " + soften(conclusion)
  );

  return {
    reasoning: softenedReasoning,
    conclusion: softenedConclusion,
    flags,
    tonedDown: true,
  };
}

export default runCoherenceChecks;
