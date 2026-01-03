// ======================================================================
// 🚩 auditFlags — Señales D2 (Red Team jurídico)
// ----------------------------------------------------------------------
// - NO decide
// - NO concluye
// - SOLO advierte
// ======================================================================

/**
 * Evalúa si un evento merece una advertencia jurídica.
 * @param {Object} event - evento auditado
 */
export function inferFlags(event) {
  const flags = [];
  const text = String(event.content || "").toLowerCase();

  // 🔴 D2.1 — Juez errático / práctica reiterada
  if (
    text.includes("siempre lo hace") ||
    text.includes("es costumbre") ||
    text.includes("siempre resuelve así")
  ) {
    flags.push({
      type: "advertencia_motivacion",
      message:
        "La reiteración de una práctica no sustituye la motivación exigida por ley.",
    });
  }

  // 🔴 D2.2 — Falacia ad populum
  if (
    text.includes("la prensa aplaudió") ||
    text.includes("todos están de acuerdo") ||
    text.includes("fue bien recibido")
  ) {
    flags.push({
      type: "advertencia_legitimidad",
      message:
        "La aceptación social no determina la validez jurídica de una decisión.",
    });
  }

  // 🔴 D2.3 — Autoridad sin método (perito / juez)
  if (
    text.includes("el perito dijo") ||
    text.includes("según el experto") ||
    text.includes("el juez considera")
  ) {
    flags.push({
      type: "advertencia_metodologia",
      message:
        "La autoridad invocada debe ir acompañada de metodología y sustento verificable.",
    });
  }

  // 🔴 D2.4 — Cherry picking probatorio
  if (
    text.includes("solo esta prueba") ||
    text.includes("las demás no importan")
  ) {
    flags.push({
      type: "advertencia_prueba",
      message:
        "La valoración parcial de la prueba puede generar sesgo probatorio.",
    });
  }

  // 🔴 D2.5 — Verdad procesal absolutizada
  if (
    text.includes("si el expediente dice") ||
    text.includes("es la verdad procesal")
  ) {
    flags.push({
      type: "advertencia_verdad",
      message:
        "La verdad procesal no excluye el análisis crítico de la motivación y coherencia.",
    });
  }

  return flags;
}
