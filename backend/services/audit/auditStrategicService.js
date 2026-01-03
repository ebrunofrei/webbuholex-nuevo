// ============================================================================
// 🧠 auditStrategicService — Lectura estratégica del caso (UX-6.8)
// ----------------------------------------------------------------------------
// - NO IA
// - NO inferencias jurídicas
// - SOLO síntesis objetiva del riesgo probatorio
// ============================================================================

export function buildStrategicSummary(timeline = []) {
  const summary = {
    totalEvents: timeline.length,
    ok: 0,
    warning: 0,
    critical: 0,
    criticalEvents: [],
    warningEvents: [],
  };

  for (const ev of timeline) {
    if (ev.riskLevel === "ok") summary.ok++;
    if (ev.riskLevel === "warning") {
      summary.warning++;
      summary.warningEvents.push(ev);
    }
    if (ev.riskLevel === "critical") {
      summary.critical++;
      summary.criticalEvents.push(ev);
    }
  }

  return {
    ...summary,
    healthStatus:
      summary.critical > 0
        ? "high_risk"
        : summary.warning > 0
        ? "medium_risk"
        : "stable",
  };
}
