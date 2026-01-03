// ======================================================================
// ⚖️ MOTIVATION AUDIT – CONTROL DE MOTIVACIÓN APARENTE
// ======================================================================

export function auditMotivation({ analysis, decisionText = "" }) {
  const issues = [];

  if (!analysis) return { hasApparentMotivation: false, issues };

  if (analysis.score < 0.6) {
    issues.push(
      "Bajo nivel de coherencia lógica entre premisas y conclusión."
    );
  }

  if (analysis.fallacies?.detected?.length) {
    issues.push(
      "Se detectan falacias lógicas que comprometen la motivación de la decisión."
    );
  }

  if (!decisionText || decisionText.length < 300) {
    issues.push(
      "La motivación es insuficiente o meramente enunciativa."
    );
  }

  return {
    hasApparentMotivation: issues.length > 0,
    issues,
  };
}
