// ============================================================================
// 🦉 auditManeuverService — UX-7.4 Zonas de maniobra estratégica
// ----------------------------------------------------------------------------
// - NO recomendaciones
// - NO ejecución
// - SOLO detección de espacios jurídicamente flexibles
// ============================================================================

export function buildStrategicManeuvers(timeline = []) {
  const zones = [];

  if (!Array.isArray(timeline) || timeline.length === 0) {
    return {
      summary: "No hay información suficiente para detectar maniobras.",
      zones: [],
    };
  }

  timeline.forEach((event, index) => {
    // ------------------------------------------------------------
    // 🔹 Criterios mínimos de maniobra
    // ------------------------------------------------------------
    const risk = event.riskLevel || "unknown";
    const hasPayload = event.payload && Object.keys(event.payload).length > 0;
    const hasFlags = Array.isArray(event.flags) && event.flags.length > 0;

    if (
      (risk === "ok" || risk === "warning") &&
      !hasFlags &&
      hasPayload
    ) {
      zones.push({
        id: `M-${event.id || index}`,
        eventId: event.id,
        type: event.type || "unknown",
        level: risk === "ok" ? "amplia" : "limitada",
        title: "Zona de maniobra identificada",
        description:
          risk === "ok"
            ? "Evento con bajo riesgo y estructura estable."
            : "Evento con riesgo moderado y margen condicionado.",
        note:
          risk === "ok"
            ? "Puede reforzarse sin comprometer coherencia."
            : "Admite ajustes con cautela jurídica.",
      });
    }
  });

  return {
    summary:
      zones.length === 0
        ? "No se identifican zonas de maniobra jurídica."
        : `Se detectaron ${zones.length} zonas de maniobra estratégica.`,
    zones,
  };
}
