// ============================================================================
// 🦉 auditRedLineService — UX-7.6 Líneas rojas del caso
// ----------------------------------------------------------------------------
// - NO recomendaciones
// - NO ejecución
// - SOLO delimitación de prohibiciones estructurales
// ============================================================================

export function buildRedLines({
  verification = null,
  noReturn = null,
  tensions = [],
}) {
  const redLines = [];

  // ------------------------------------------------------------
  // 🔴 1. Cadena de auditoría inválida
  // ------------------------------------------------------------
  if (verification && verification.valid === false) {
    redLines.push({
      id: "RL-INTEGRITY",
      category: "integridad",
      title: "No actuar con cadena de auditoría comprometida",
      description:
        "Cualquier actuación posterior carecería de soporte jurídico verificable.",
      reason:
        "Vulnera trazabilidad, confiabilidad y control lógico del caso.",
    });
  }

  // ------------------------------------------------------------
  // 🔴 2. Puntos de no retorno detectados
  // ------------------------------------------------------------
  if (noReturn && Array.isArray(noReturn.points)) {
    noReturn.points.forEach((p, idx) => {
      redLines.push({
        id: `RL-NR-${idx}`,
        category: p.category || "estructural",
        title: "Evitar actuación en punto crítico irreversible",
        description: p.description,
        reason:
          "La estructura del caso no soporta decisiones adicionales en este punto.",
      });
    });
  }

  // ------------------------------------------------------------
  // 🔴 3. Tensiones críticas
  // ------------------------------------------------------------
  tensions
    .filter((t) => t.severity === "alta")
    .forEach((t, idx) => {
      redLines.push({
        id: `RL-TENSION-${idx}`,
        category: "tensión",
        title: "No forzar actuación sobre tensión jurídica crítica",
        description: t.description,
        reason:
          "Incrementa riesgo de nulidad, contradicción o pérdida de coherencia.",
      });
    });

  return {
    summary:
      redLines.length === 0
        ? "No se identifican líneas rojas jurídicas activas."
        : `Se identificaron ${redLines.length} líneas rojas del caso.`,
    redLines,
  };
}
