// ============================================================================
// 🦉 auditResilienceService — UX-7.3 Puntos de resiliencia
// ----------------------------------------------------------------------------
// - NO inferencias
// - NO recomendaciones
// - SOLO detección de fortalezas estructurales
// ============================================================================

export function buildCaseResilience(timeline = []) {
  const resiliencePoints = [];

  if (!Array.isArray(timeline) || timeline.length === 0) {
    return {
      summary: "Sin información suficiente para evaluar resiliencia.",
      points: [],
    };
  }

  // ------------------------------------------------------------
  // 🔹 COHERENCIA TEMPORAL
  // ------------------------------------------------------------
  let temporalOk = true;
  for (let i = 1; i < timeline.length; i++) {
    if (
      timeline[i - 1].at &&
      timeline[i].at &&
      new Date(timeline[i].at) < new Date(timeline[i - 1].at)
    ) {
      temporalOk = false;
      break;
    }
  }

  if (temporalOk) {
    resiliencePoints.push({
      id: "R-TEMP-OK",
      type: "temporal",
      strength: "alta",
      title: "Secuencia cronológica coherente",
      description:
        "Los eventos mantienen una progresión temporal consistente.",
      note: "Fortalece defensa ante cuestionamientos de orden procesal.",
    });
  }

  // ------------------------------------------------------------
  // 🔹 SOPORTE PROBATORIO
  // ------------------------------------------------------------
  const supportedEvents = timeline.filter(
    (e) => e.payload && Object.keys(e.payload).length > 0
  );

  if (supportedEvents.length > 0) {
    resiliencePoints.push({
      id: "R-PROB-SUPPORT",
      type: "probatoria",
      strength: "media",
      title: "Eventos con soporte explícito",
      description: `${supportedEvents.length} eventos presentan payload documentado.`,
      note: "Reduce margen de impugnación probatoria.",
    });
  }

  // ------------------------------------------------------------
  // 🔹 IDENTIDAD DE ACTORES
  // ------------------------------------------------------------
  const anonymousEvents = timeline.filter(
    (e) => !e.actor && e.type !== "system"
  );

  if (anonymousEvents.length === 0) {
    resiliencePoints.push({
      id: "R-ACTOR-CLEAR",
      type: "autoría",
      strength: "alta",
      title: "Autoría claramente identificada",
      description:
        "Todos los eventos relevantes cuentan con actor definido.",
      note: "Refuerza atribución de responsabilidad jurídica.",
    });
  }

  return {
    summary:
      resiliencePoints.length === 0
        ? "No se identifican puntos de resiliencia destacables."
        : `Se identificaron ${resiliencePoints.length} puntos de resiliencia.`,
    points: resiliencePoints,
  };
}
