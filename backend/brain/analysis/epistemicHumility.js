// backend/brain/analysis/epistemicHumility.js
// ============================================================
// D3.6 — Humildad epistémica controlada (INTERNO)
// Ajusta el alcance sin perder autoridad.
// ============================================================

function safeStr(v = "") {
  return String(v || "").trim();
}

function needsHumility(context = {}, flags = {}) {
  return (
    context.pruebaInsuficiente === true ||
    flags?.unprovenPremise === true ||
    flags?.weakAnalogy === true
  );
}

function addHumilityPreamble(text = "") {
  const preambles = [
    "Con la información disponible,",
    "A partir de los elementos actualmente acreditados,",
    "Sin perjuicio de una revisión más profunda,",
  ];
  // Selección simple y sobria
  return `${preambles[0]} ${text}`;
}

function avoidWeakLanguage(text = "") {
  return text
    .replace(/\bno sé\b/gi, "")
    .replace(/\btal vez\b/gi, "")
    .replace(/\bpodría ser cualquier cosa\b/gi, "");
}

// ============================================================
// API PRINCIPAL
// ============================================================
export function applyEpistemicHumility({
  reasoning = "",
  conclusion = "",
  context = {},
  flags = {},
}) {
  let r = safeStr(reasoning);
  let c = safeStr(conclusion);

  r = avoidWeakLanguage(r);
  c = avoidWeakLanguage(c);

  if (needsHumility(context, flags)) {
    c = addHumilityPreamble(c);
  }

  return {
    reasoning: r,
    conclusion: c,
  };
}

export default applyEpistemicHumility;
