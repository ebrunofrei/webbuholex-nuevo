// ============================================================
// 🦉 auditAlertsService — UX-6.9
// Genera alertas estratégicas NO ejecutables
// ============================================================

export function buildStrategicAlerts(timeline = [], verification = null) {
  const alerts = [];

  // 🔴 Riesgo probatorio alto
  timeline.forEach((e) => {
    if (e.riskLevel === "critical") {
      alerts.push({
        id: `risk-${e.id}`,
        level: "critical",
        category: "probatorio",
        title: "Riesgo probatorio elevado",
        message:
          "Se detecta un evento con riesgo probatorio alto que podría debilitar la coherencia del caso.",
        relatedEventIds: [e.id],
        suggestedFocus:
          "Revisar soporte probatorio y consistencia del evento.",
      });
    }
  });

  // 🟡 Eventos sin confirmación
  timeline.forEach((e) => {
    if (!e.confirmation) {
      alerts.push({
        id: `confirm-${e.id}`,
        level: "warning",
        category: "narrativo",
        title: "Evento no confirmado",
        message:
          "Existe un evento relevante que no cuenta con confirmación expresa.",
        relatedEventIds: [e.id],
        suggestedFocus:
          "Evaluar impacto narrativo del evento no confirmado.",
      });
    }
  });

  // 🔐 Integridad
  if (verification && verification.ok === false) {
    alerts.push({
      id: "integrity-chain",
      level: "critical",
      category: "integridad",
      title: "Posible ruptura de integridad",
      message:
        "La cadena de auditoría presenta inconsistencias que requieren atención.",
      suggestedFocus:
        "Analizar integridad cronológica y trazabilidad del expediente.",
    });
  }

  return alerts;
}
