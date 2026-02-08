// ============================================================================
// 🧭 RECOMMENDATION ENGINE — FASE C5 (R2 ENTERPRISE — FINAL)
// ----------------------------------------------------------------------------
// Traduce el nivel del vicio (C4) + agravios (C3) en una estrategia procesal.
// PRINCIPIOS:
//   • No declara nulidades (solo sugiere).
//   • No inventa requisitos legales.
//   • Usa únicamente señales internas del kernel (C1–C4).
//   • Produce una salida estable para el asistente legal superior (C6–C7).
// ============================================================================

export function buildProceduralRecommendation({
  vicio = { level: null },
  agravios = [],
  checklist = [],
  contexto = {},
}) {
  const level = vicio?.level ?? null;
  const soporte = agravios.map((a) => a.titulo ?? "").filter(Boolean);

  // -----------------------------------------------------------------------
  // 0) SIN VICIO → No corresponde activar acción procesal
  // -----------------------------------------------------------------------
  if (!level) {
    return {
      accion: "NINGUNA",
      via: null,
      petitorio: null,
      fundamento: "No se identifican vicios procesales relevantes.",
      soporte: [],
      riesgo: "BAJO",
      recomendacion:
        "Continuar con la estrategia principal sin activar mecanismos impugnatorios.",
    };
  }

  // -----------------------------------------------------------------------
  // 1) VICIO DETERMINANTE → conducta típica: nulidad inmediata
  // -----------------------------------------------------------------------
  if (level === "DETERMINANTE") {
    return {
      accion: "NULIDAD",
      via: "INCIDENTE O APELACIÓN",
      petitorio:
        "Se solicite la nulidad de la resolución por comprometer la motivación suficiente y el debido proceso.",
      fundamento:
        "El defecto identificado es estructural y afecta la validez de la resolución.",
      soporte,
      riesgo: "BAJO",
      recomendacion:
        "Plantear la nulidad de inmediato, evitando que la resolución adquiera firmeza.",
    };
  }

  // -----------------------------------------------------------------------
  // 2) VICIO GRAVE → apelación ordinaria como vía principal
  // -----------------------------------------------------------------------
  if (level === "GRAVE") {
    return {
      accion: "APELACIÓN",
      via: "ORDINARIA",
      petitorio:
        "Se solicite la revocatoria por defectos graves en la motivación o en la estructura razonativa.",
      fundamento:
        "Se identifican agravios relevantes que afectan la justificación racional de la decisión.",
      soporte,
      riesgo: "MEDIO",
      recomendacion:
        "Reforzar el recurso con análisis lógico complementario y criterios jurisprudenciales pertinentes.",
    };
  }

  // -----------------------------------------------------------------------
  // 3) VICIO LEVE → dejar constancia (reserva estratégica)
  // -----------------------------------------------------------------------
  return {
    accion: "RESERVA",
    via: "EVENTUAL",
    petitorio:
      "Se deje constancia del defecto para su eventual invocación en etapas impugnatorias posteriores.",
    fundamento:
      "El defecto no genera indefensión inmediata, pero resulta relevante para control futuro.",
    soporte,
    riesgo: "ALTO",
    recomendacion:
      "No activar mecanismos impugnatorios por ahora; documentar el vicio y monitorear su impacto.",
  };
}
