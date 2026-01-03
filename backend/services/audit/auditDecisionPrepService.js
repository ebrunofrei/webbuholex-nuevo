// ============================================================================
// 🦉 auditDecisionPrepService — UX-8.0 Preparación para decisión humana
// ----------------------------------------------------------------------------
// - NO decisiones
// - NO recomendaciones
// - SOLO síntesis estructural del caso
// ============================================================================

export function buildDecisionPreparation({
  strategy,
  checklist,
  tensions,
  resilience,
  maneuvers,
  noReturn,
  redLines,
}) {
  return {
    purpose:
      "Este resumen prepara al decisor humano para adoptar una decisión informada.",
    considerations: {
      strategicReading: strategy?.summary || null,
      criticalTensions: tensions?.summary || null,
      structuralStrengths: resilience?.summary || null,
      maneuverSpace: maneuvers?.summary || null,
      irreversibleRisks: noReturn?.summary || null,
      prohibitions: redLines?.summary || null,
    },
    reminder:
      "La decisión final corresponde exclusivamente al humano responsable.",
  };
}
