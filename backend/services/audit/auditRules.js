// ======================================================================
// 🧠 auditRules — Reglas de auditoría jurídica
// ----------------------------------------------------------------------
// - NO IA
// - NO embeddings
// - NO frontend
// - Lógica de dominio pura
// ======================================================================

/**
 * Infere el tipo de evento jurídico a partir del contenido y contexto.
 * @param {Object} msg - ChatMessage
 * @param {number} index - posición en el timeline
 * @param {Array} all - todos los mensajes del caso
 */
export function inferEventType(msg, index, all = []) {
  const text = String(msg.content || "").toLowerCase();

  // 1) Inicio de consulta
  if (index === 0) {
    return "inicio_consulta";
  }

  // 2) Petición expresa
  if (
    text.includes("quiero") ||
    text.includes("solicito") ||
    text.includes("pido") ||
    text.includes("necesito")
  ) {
    return "peticion";
  }

  // 3) Narración de hechos
  if (
    text.includes("ocurrió") ||
    text.includes("sucedió") ||
    text.includes("pasó") ||
    text.includes("hecho")
  ) {
    return "hecho_narrado";
  }

  // 4) Hipótesis jurídica
  if (
    text.includes("podría") ||
    text.includes("sería posible") ||
    text.includes("configuraría") ||
    text.includes("se trataría de")
  ) {
    return "hipotesis_juridica";
  }

  // 5) Cambio de estrategia (regla simple inicial)
  const prev = all[index - 1];
  if (prev && prev.role === msg.role) {
    const prevText = String(prev.content || "").toLowerCase();

    if (
      (prevText.includes("demanda") && text.includes("conciliar")) ||
      (prevText.includes("denuncia") && text.includes("acuerdo"))
    ) {
      return "cambio_estrategia";
    }
  }

  // 6) Respuesta / decisión del asistente
  if (msg.role === "assistant") {
    return "decision_asistente";
  }

  // 7) Seguimiento
  if (
    text.includes("entonces") ||
    text.includes("en ese caso") ||
    text.includes("siguiendo")
  ) {
    return "seguimiento";
  }

  // 8) Evento genérico (fallback)
  return "evento_general";
}

/**
 * Infere el nivel de riesgo jurídico del evento.
 * @param {Object} msg - ChatMessage
 * @param {string} tipoEvento - resultado de inferEventType
 */
export function inferRisk(msg, tipoEvento) {
  const text = String(msg.content || "").toLowerCase();

  // Riesgo crítico
  if (
    tipoEvento === "contradiccion_potencial" ||
    text.includes("plazo vencido") ||
    text.includes("fuera de plazo") ||
    text.includes("ya venció")
  ) {
    return "critico";
  }

  // Riesgo alto
  if (
    tipoEvento === "cambio_estrategia" ||
    text.includes("me equivoqué") ||
    text.includes("no estoy seguro")
  ) {
    return "alto";
  }

  // Riesgo medio
  if (
    tipoEvento === "peticion" ||
    tipoEvento === "hipotesis_juridica"
  ) {
    return "medio";
  }

  // Riesgo bajo
  if (
    tipoEvento === "hecho_narrado" ||
    tipoEvento === "seguimiento"
  ) {
    return "bajo";
  }

  return "bajo";
}
