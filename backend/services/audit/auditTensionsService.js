// ============================================================================
// 🦉 auditTensionService — UX-7.2 Tensiones del caso
// ----------------------------------------------------------------------------
// - NO inferencias
// - NO decisiones
// - SOLO detección de fricciones estructurales
// ============================================================================

export function buildCaseTensions(timeline = []) {
  const tensions = [];

  if (!Array.isArray(timeline) || timeline.length < 2) {
    return {
      summary: "Sin información suficiente para detectar tensiones.",
      tensions: [],
    };
  }

  // ------------------------------------------------------------
  // 🔹 TENSIÓN TEMPORAL: eventos críticos fuera de secuencia lógica
  // ------------------------------------------------------------
  for (let i = 1; i < timeline.length; i++) {
    const prev = timeline[i - 1];
    const curr = timeline[i];

    if (
      prev.at &&
      curr.at &&
      new Date(curr.at).getTime() < new Date(prev.at).getTime()
    ) {
      tensions.push({
        id: `T-TEMP-${i}`,
        type: "temporal",
        severity: "alta",
        title: "Inconsistencia temporal detectada",
        description:
          "Existe un evento posterior con fecha anterior al evento previo, lo que rompe la secuencia cronológica.",
        relatedEvents: [prev.id, curr.id],
        note: "Puede ser cuestionado en control de coherencia procesal.",
      });
    }
  }

  // ------------------------------------------------------------
  // 🔹 TENSIÓN PROBATORIA: resultado afirmativo sin soporte previo
  // ------------------------------------------------------------
  timeline.forEach((ev, idx) => {
    if (
      ev.result?.ok === true &&
      (!ev.payload || Object.keys(ev.payload).length === 0)
    ) {
      tensions.push({
        id: `T-PROB-${idx}`,
        type: "probatoria",
        severity: "media",
        title: "Resultado afirmativo con soporte débil",
        description:
          "El evento presenta un resultado positivo sin payload o sustento explícito.",
        relatedEvents: [ev.id],
        note: "Zona discutible ante contradicción o impugnación.",
      });
    }
  });

  // ------------------------------------------------------------
  // 🔹 TENSIÓN DE ACTOR: actos relevantes sin actor identificable
  // ------------------------------------------------------------
  timeline.forEach((ev, idx) => {
    if (!ev.actor && ev.type !== "system") {
      tensions.push({
        id: `T-ACTOR-${idx}`,
        type: "autoría",
        severity: "media",
        title: "Evento sin actor identificado",
        description:
          "Se registra un evento relevante sin identificación clara del responsable.",
        relatedEvents: [ev.id],
        note: "Puede debilitar atribución de responsabilidad.",
      });
    }
  });

  return {
    summary:
      tensions.length === 0
        ? "No se detectan tensiones jurídicas estructurales."
        : `Se detectaron ${tensions.length} tensiones jurídicas relevantes.`,
    tensions,
  };
}
