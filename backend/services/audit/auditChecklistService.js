// ============================================================================
// 🧠 auditChecklistService — UX-7.0
// ----------------------------------------------------------------------------
// - Checklists estratégicos NO ejecutables
// - Preparación jurídica del caso
// - Basado en auditoría, integridad y alertas
// ============================================================================

export function buildStrategicChecklist({
  timeline = [],
  verification = null,
  alerts = [],
}) {
  const checklist = [];

  // ------------------------------------------------------------
  // 1️⃣ Integridad y trazabilidad
  // ------------------------------------------------------------
  if (verification && verification.valid === false) {
    checklist.push({
      category: "integridad",
      priority: "alta",
      message:
        "Revisar cadena de auditoría: existen rupturas o inconsistencias detectadas.",
    });
  }

  // ------------------------------------------------------------
  // 2️⃣ Riesgos probatorios
  // ------------------------------------------------------------
  const highRiskEvents = timeline.filter(
    (e) => e.riskLevel === "critical"
  );

  if (highRiskEvents.length > 0) {
    checklist.push({
      category: "prueba",
      priority: "alta",
      message:
        "Identificar y reforzar eventos con riesgo probatorio crítico.",
      relatedEvents: highRiskEvents.map((e) => e.id),
    });
  }

  // ------------------------------------------------------------
  // 3️⃣ Alertas estratégicas
  // ------------------------------------------------------------
  alerts.forEach((alert) => {
    checklist.push({
      category: "estrategia",
      priority: alert.severity || "media",
      message: alert.message,
      source: "alerta_estrategica",
    });
  });

  // ------------------------------------------------------------
  // 4️⃣ Coherencia narrativa
  // ------------------------------------------------------------
  if (timeline.length > 0) {
    checklist.push({
      category: "narrativa",
      priority: "media",
      message:
        "Verificar coherencia temporal y lógica entre los actos del caso.",
    });
  }

  // ------------------------------------------------------------
  // 5️⃣ Preparación procesal (sin actos)
  // ------------------------------------------------------------
  checklist.push({
    category: "preparacion",
    priority: "baja",
    message:
      "Confirmar que la teoría del caso esté alineada con los hechos auditados.",
  });

  return checklist;
}
