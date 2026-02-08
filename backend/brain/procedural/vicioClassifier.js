// ======================================================================
// ⚖️ VICIO CLASSIFIER — C4 (R2 ENTERPRISE)
// ----------------------------------------------------------------------
// Clasifica el tipo de vicio procesal según señales estructurales:
//   • Motivación aparente (C3)
//   • Falacias detectadas (B2)
//   • Score lógico (C1)
// 
// Niveles (compatibles con C5):
//   - DETERMINANTE
//   - GRAVE
//   - LEVE
//   - SIN VICIO
// 
// NO genera texto. NO hace inferencias jurídicas.
// ======================================================================

export function classifyVicio({ analysis = {}, audit = {} }) {
  const fallacies = analysis?.fallacies?.detected ?? [];
  const score = Number(analysis?.score ?? 1);

  // C3: motivación aparente
  const hasApparentMotivation = Boolean(audit?.hasApparentMotivation);

  // Número total de falacias
  const fallacyCount = fallacies.length;

  // Falacias consideradas "críticas" según tu catálogo real (alta severidad)
  const hasCriticalFallacy = fallacies.some(f => f.severity === "alta");

  // =============================================================
  // 1) VICIO DETERMINANTE — combinación explosiva
  // =============================================================
  if (hasApparentMotivation && (hasCriticalFallacy || fallacyCount >= 2)) {
    return {
      level: "DETERMINANTE",
      motivo:
        "Concurren motivación aparente y patrones de falacia severos que comprometen la validez estructural.",
    };
  }

  // =============================================================
  // 2) VICIO GRAVE — falla relevante en la argumentación
  // =============================================================
  if (
    hasCriticalFallacy ||
    fallacyCount >= 1 ||
    score < 0.50
  ) {
    return {
      level: "GRAVE",
      motivo:
        "Se identifican falencias argumentativas de impacto relevante en la consistencia del razonamiento.",
    };
  }

  // =============================================================
  // 3) VICIO LEVE — defecto menor no invalidante
  // =============================================================
  if (hasApparentMotivation || score < 0.75) {
    return {
      level: "LEVE",
      motivo:
        "Existen deficiencias menores que no comprometen la validez, pero deben ser documentadas.",
    };
  }

  // =============================================================
  // 4) SIN VICIO — razonamiento estable
  // =============================================================
  return {
    level: null,
    motivo: "No se observan vicios procesales relevantes.",
  };
}

export default classifyVicio;
