// ======================================================================
// ⏱️ TIMING ADVISOR — OPORTUNIDAD PROCESAL (C5 · R2 ENTERPRISE)
// ----------------------------------------------------------------------
// Rol:
//   • Evaluar urgencia temporal en función de la acción procesal sugerida.
//   • No interpreta derecho, no decide estrategia, no altera C5.
//   • Devuelve un indicador sobrio de oportunidad: URGENTE / ALERTA / ADECUADO.
// ======================================================================

export function adviseTiming({ accion = "", plazoLegal = null }) {
  const a = String(accion || "").trim().toUpperCase();
  const d = Number.isFinite(plazoLegal) ? plazoLegal : null;

  // -------------------------------------------------------------------
  // 0) Sin acción → no aplica timing
  // -------------------------------------------------------------------
  if (!a || a === "NINGUNA") return null;

  // -------------------------------------------------------------------
  // 1) Sin plazo → oportunidad abierta
  // -------------------------------------------------------------------
  if (d === null) {
    return "Oportunidad abierta: el plazo no está determinado.";
  }

  // -------------------------------------------------------------------
  // 2) MATRIZ DE URGENCIA (ENTERPRISE 2025)
  //     Se calibró para:
  //       - NULIDAD    → reacción más breve
  //       - APELACIÓN  → plazos típicos más amplios
  //       - RESERVA    → normalmente no perentoria
  // -------------------------------------------------------------------

  // === NULIDAD ===
  if (a === "NULIDAD") {
    if (d <= 2) return "URGENTE: presentar la nulidad de inmediato.";
    if (d <= 5) return "ALERTA: preparar el escrito con prioridad alta.";
    return "TIEMPO ADECUADO: se puede estructurar con razonable calma.";
  }

  // === APELACIÓN ===
  if (a === "APELACIÓN") {
    if (d <= 3) return "URGENTE: consolidar agravios y presentar la apelación.";
    if (d <= 7) return "ALERTA: avanzar la redacción con prioridad media.";
    return "TIEMPO ADECUADO: no hay presión inmediata.";
  }

  // === RESERVA ===
  if (a === "RESERVA") {
    if (d <= 3) return "CONVENIENTE: dejar constancia a la brevedad.";
    return "SIN URGENCIA: la reserva puede documentarse sin presión temporal.";
  }

  // -------------------------------------------------------------------
  // 3) Acción no clasificada (fallback seguro)
  // -------------------------------------------------------------------
  if (d <= 3) return "URGENTE: el plazo está por vencer.";
  if (d <= 7) return "ALERTA: preparar con prioridad media.";
  return "TIEMPO ADECUADO: no hay presión inmediata.";
}
