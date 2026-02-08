// ======================================================================
// ⚖️ MOTIVATION AUDIT – CONTROL DE MOTIVACIÓN APARENTE (R2 ENTERPRISE)
// ----------------------------------------------------------------------
// Evalúa si la decisión presenta insuficiencia, circularidad o
// deficiencia lógica que comprometa su motivación.
// ======================================================================

export function auditMotivation({ analysis = {}, decisionText = "" }) {
  const issues = [];

  // Si no hay análisis previo, se asume imposible evaluar motivación.
  if (!analysis || typeof analysis !== "object") {
    return { hasApparentMotivation: false, issues };
  }

  // -------------------------------------------------------------
  // 1) Coherencia lógica global
  // -------------------------------------------------------------
  const score = typeof analysis.score === "number" ? analysis.score : 1;

  if (score < 0.60) {
    issues.push(
      "Existe un nivel reducido de coherencia lógica entre premisas y conclusión, lo cual debilita la motivación."
    );
  }

  // -------------------------------------------------------------
  // 2) Falacias lógicas detectadas
  // -------------------------------------------------------------
  if (analysis.fallacies?.detected?.length > 0) {
    issues.push(
      "Se identifican falacias lógicas que afectan la validez de la motivación judicial."
    );
  }

  // -------------------------------------------------------------
  // 3) Extensión mínima de motivación
  // -------------------------------------------------------------
  if (!decisionText || decisionText.trim().length < 300) {
    issues.push(
      "La motivación es breve, insuficiente o meramente enunciativa, sin desarrollo argumentativo verificable."
    );
  }

  // -------------------------------------------------------------
  // RESULTADO FINAL
  // -------------------------------------------------------------
  return {
    hasApparentMotivation: issues.length > 0,
    issues,
  };
}
