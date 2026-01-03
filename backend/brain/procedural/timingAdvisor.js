// backend/brain/procedural/timingAdvisor.js
// =========================================
// ⏱️ TIMING ADVISOR – OPORTUNIDAD PROCESAL
// =========================================

export function adviseTiming({ accion, plazoLegal }) {
  if (!accion || accion === "NINGUNA") return null;

  if (plazoLegal && plazoLegal <= 3) {
    return "URGENTE: el plazo está por vencer.";
  }

  if (plazoLegal && plazoLegal <= 7) {
    return "ALERTA: preparar escrito con prioridad media.";
  }

  return "TIEMPO ADECUADO: no hay presión inmediata de plazo.";
}
