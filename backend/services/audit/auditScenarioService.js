// ============================================================================
// 🧠 auditScenarioService — UX-7.1
// ----------------------------------------------------------------------------
// - Simulación comparativa de escenarios
// - NO predictivo
// - NO probabilidades
// - Lectura jurídica razonada
// ============================================================================

export function buildScenarioSimulation({
  timeline = [],
  alerts = [],
  checklist = [],
}) {
  const scenarios = [];

  // ------------------------------------------------------------
  // 🅰️ Escenario 1: Escenario conservador
  // ------------------------------------------------------------
  scenarios.push({
    key: "conservador",
    title: "Escenario conservador",
    description:
      "Lectura restrictiva del caso, priorizando riesgos probatorios y posibles cuestionamientos.",
    assumptions: [
      "El órgano decisor valora estrictamente la prueba",
      "Se cuestionan inconsistencias formales",
    ],
    focus: [
      "Integridad probatoria",
      "Coherencia temporal",
      "Trazabilidad de actos",
    ],
    risks: alerts
      .filter((a) => a.severity === "alta")
      .map((a) => a.message),
  });

  // ------------------------------------------------------------
  // 🅱️ Escenario 2: Escenario equilibrado
  // ------------------------------------------------------------
  scenarios.push({
    key: "equilibrado",
    title: "Escenario equilibrado",
    description:
      "Lectura ponderada del caso, considerando contexto, razonabilidad y conjunto probatorio.",
    assumptions: [
      "Valoración integral de los hechos",
      "Importancia de la narrativa del caso",
    ],
    focus: [
      "Consistencia global",
      "Relación hechos–prueba",
      "Narrativa jurídica",
    ],
    supports: checklist
      .filter((c) => c.priority !== "alta")
      .map((c) => c.message),
  });

  // ------------------------------------------------------------
  // 🅾️ Escenario 3: Escenario favorable
  // ------------------------------------------------------------
  scenarios.push({
    key: "favorable",
    title: "Escenario favorable",
    description:
      "Lectura extensiva del caso, resaltando coherencia, intención y finalidad jurídica.",
    assumptions: [
      "Interpretación pro-derechos",
      "Prevalece la finalidad sobre la forma",
    ],
    focus: [
      "Finalidad jurídica",
      "Buena fe",
      "Contexto fáctico completo",
    ],
    strengths: timeline
      .filter((e) => e.riskLevel === "ok")
      .map((e) => e.type),
  });

  return {
    generatedAt: new Date().toISOString(),
    disclaimer:
      "Los escenarios presentados son lecturas jurídicas comparativas. No constituyen predicción ni recomendación de actuación.",
    scenarios,
  };
}
    