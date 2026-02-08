// ======================================================================
// ⚖️ GRIEVANCE BUILDER – AGRAVIOS LÓGICO-JURÍDICOS (R2 ENTERPRISE)
// ----------------------------------------------------------------------
// Genera agravios estructurados a partir del análisis lógico y auditoría
// de motivación. NO redacta texto final para el usuario.
// ======================================================================

export function buildGrievances({ analysis = {}, audit = {} }) {
  const agravios = [];
  let counter = 1;

  // -------------------------------------------------------------
  // 1) Motivación aparente (motivación deficiente o insuficiente)
  // -------------------------------------------------------------
  if (audit?.hasApparentMotivation && Array.isArray(audit.issues)) {
    audit.issues.forEach((issue) => {
      agravios.push({
        titulo: `Agravio ${counter++}: Motivación aparente`,
        fundamento:
          `${issue}. Ello vulnera el estándar constitucional y legal de ` +
          `motivación suficiente exigido a las resoluciones judiciales.`,
      });
    });
  }

  // -------------------------------------------------------------
  // 2) Falacias lógicas detectadas por el motor de análisis
  // -------------------------------------------------------------
  if (analysis?.fallacies?.detected?.length) {
    analysis.fallacies.detected.forEach((f) => {
      agravios.push({
        titulo: `Agravio ${counter++}: Falacia ${f.label}`,
        fundamento:
          `La decisión incurre en la falacia ${f.label} (${f.block}), ` +
          "lo que compromete la validez de la inferencia lógica empleada.",
      });
    });
  }

  return agravios;
}
