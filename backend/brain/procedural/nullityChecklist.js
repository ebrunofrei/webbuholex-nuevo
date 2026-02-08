// ======================================================================
// ⚖️ NULLITY CHECKLIST – CONTROL DE NULIDADES (R2 ENTERPRISE)
// ----------------------------------------------------------------------
// Evalúa si existen indicadores de nulidad basados en:
//  - Motivación aparente
//  - Agravios lógico-jurídicos detectados por el sistema
// Este checklist es interno: NO redacta, NO califica la nulidad,
// solo identifica señales objetivas para el motor procesal.
// ======================================================================

export function buildNullityChecklist({ audit = {}, agravios = [] }) {
  const checklist = [];

  // -------------------------------------------------------------
  // 1) Motivación aparente o insuficiente
  // -------------------------------------------------------------
  if (audit.hasApparentMotivation) {
    checklist.push(
      "Motivación aparente o insuficiente: el razonamiento expuesto no alcanza el estándar de motivación exigible."
    );
  }

  // -------------------------------------------------------------
  // 2) Agravios lógicos detectados (falacias, inferencias inválidas)
  // -------------------------------------------------------------
  if (Array.isArray(agravios) && agravios.length > 0) {
    checklist.push(
      "Se identifican agravios lógico-jurídicos relevantes que comprometen la validez de la inferencia."
    );
  }

  // -------------------------------------------------------------
  // 3) Caso sin vicios relevantes
  // -------------------------------------------------------------
  if (checklist.length === 0) {
    checklist.push(
      "No se identifican vicios determinantes desde el análisis lógico-estructural."
    );
  }

  return checklist;
}
