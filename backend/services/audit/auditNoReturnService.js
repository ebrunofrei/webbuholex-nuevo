// ============================================================================
// 🦉 auditNoReturnService — UX-7.5 Puntos de no retorno
// ----------------------------------------------------------------------------
// - NO recomendaciones
// - NO ejecución
// - SOLO identificación de límites críticos del caso
// ============================================================================

export function buildNoReturnPoints({
  timeline = [],
  tensions = [],
  verification = null,
}) {
  const points = [];

  if (!Array.isArray(timeline) || timeline.length === 0) {
    return {
      summary: "No hay información suficiente para evaluar puntos de no retorno.",
      points: [],
    };
  }

  // ------------------------------------------------------------
  // 🔹 1. Ruptura de integridad (cadena inválida)
  // ------------------------------------------------------------
  if (verification && verification.valid === false) {
    points.push({
      id: "NR-INTEGRITY",
      category: "integridad",
      severity: "crítica",
      title: "Cadena de auditoría comprometida",
      description:
        "La integridad de la secuencia auditada presenta rupturas verificadas.",
      consequence:
        "Cualquier acto posterior carece de respaldo estructural.",
    });
  }

  // ------------------------------------------------------------
  // 🔹 2. Tensiones críticas no mitigadas
  // ------------------------------------------------------------
  tensions
    .filter((t) => t.severity === "alta")
    .forEach((t, idx) => {
      points.push({
        id: `NR-TENSION-${idx}`,
        category: "estructural",
        severity: "alta",
        title: "Tensión jurídica crítica",
        description: t.description,
        consequence:
          "Una acción incorrecta en este punto puede volver irreversible el daño.",
      });
    });

  // ------------------------------------------------------------
  // 🔹 3. Eventos con alto impacto y sin resiliencia
  // ------------------------------------------------------------
  timeline.forEach((ev, idx) => {
    if (
      ev.riskLevel === "alto" &&
      (!ev.payload || Object.keys(ev.payload).length === 0)
    ) {
      points.push({
        id: `NR-EVENT-${idx}`,
        category: "probatoria",
        severity: "alta",
        title: "Evento de alto riesgo sin soporte suficiente",
        description:
          "El evento presenta alto impacto jurídico sin respaldo estructural.",
        consequence:
          "Una decisión errónea aquí puede cerrar vías defensivas futuras.",
      });
    }
  });

  return {
    summary:
      points.length === 0
        ? "No se detectan puntos de no retorno jurídicos."
        : `Se detectaron ${points.length} puntos de no retorno.`,
    points,
  };
}
