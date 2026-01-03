// ======================================================================
// ⚖️ NULLITY CHECKLIST – CONTROL DE NULIDADES
// ======================================================================

export function buildNullityChecklist({ audit, agravios }) {
  const checklist = [];

  if (audit?.hasApparentMotivation) {
    checklist.push("❌ Motivación aparente o insuficiente.");
  }

  if (agravios?.length) {
    checklist.push("❌ Existencia de agravios lógicos relevantes.");
  }

  if (!checklist.length) {
    checklist.push("✔️ No se detectan vicios lógicos determinantes.");
  }

  return checklist;
}
