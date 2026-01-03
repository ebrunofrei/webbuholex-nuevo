// backend/brain/analysis/coherenceChecks.js
// ============================================================
// D3.5 — Tests de coherencia interna (INTERNO)
// Rebaja tono y alcance si detecta inconsistencias.
// ============================================================

function safeStr(v = "") {
  return String(v || "").trim();
}

function hasUnprovenPremise(facts = [], context = {}) {
  return !facts || facts.length === 0 || context.pruebaInsuficiente === true;
}

function overclaims(text = "") {
  return /\bes\b|\bdebe\b|\bcorresponde\b/i.test(text);
}

function probabilityAsCertainty(text = "") {
  return /concluye|demuestra|queda acreditado/i.test(text);
}

function weakAnalogy(context = {}) {
  return context.usaAnalogía === true && context.identidadRelevante !== true;
}

function disproportionateGravity(gravity = {}, context = {}) {
  if (!gravity?.label) return false;
  if (gravity.label === "nulidad" && context.afectaDefensa !== true) return true;
  return false;
}

function soften(text = "") {
  return text
    .replace(/\bes\b/gi, "resulta")
    .replace(/\bdebe\b/gi, "podría")
    .replace(/\bcorresponde\b/gi, "sería pertinente");
}

// ============================================================
// API PRINCIPAL
// ============================================================
export function runCoherenceChecks({
  reasoning = "",
  conclusion = "",
  facts = [],
  gravity = {},
  context = {},
}) {
  let flags = {
    unprovenPremise: hasUnprovenPremise(facts, context),
    overclaims: overclaims(reasoning + " " + conclusion),
    probabilityAsCertainty: probabilityAsCertainty(reasoning + " " + conclusion),
    weakAnalogy: weakAnalogy(context),
    disproportionateGravity: disproportionateGravity(gravity, context),
  };

  const failed = Object.values(flags).some(Boolean);

  if (!failed) {
    return { reasoning, conclusion, flags, tonedDown: false };
  }

  // Rebaja automática
  const newReasoning = soften(reasoning);
  const newConclusion =
    "Con la información disponible, " + soften(conclusion);

  return {
    reasoning: safeStr(newReasoning),
    conclusion: safeStr(newConclusion),
    flags,
    tonedDown: true,
  };
}

export default runCoherenceChecks;
