// ======================================================================
// ⚖️ GRIEVANCE BUILDER – AGRAVIOS LÓGICO-JURÍDICOS
// ======================================================================

export function buildGrievances({ analysis, audit }) {
  const agravios = [];

  if (audit?.hasApparentMotivation) {
    audit.issues.forEach((issue, idx) => {
      agravios.push({
        titulo: `Agravio ${idx + 1}: Motivación aparente`,
        fundamento:
          issue +
          " Ello vulnera el deber de motivación suficiente de las resoluciones judiciales.",
      });
    });
  }

  if (analysis?.fallacies?.detected?.length) {
    analysis.fallacies.detected.forEach((f, idx) => {
      agravios.push({
        titulo: `Agravio adicional ${idx + 1}: Falacia ${f.label}`,
        fundamento:
          `La decisión incurre en la falacia ${f.label} (${f.block}), ` +
          "lo que invalida la inferencia lógica empleada.",
      });
    });
  }

  return agravios;
}
