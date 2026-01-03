// ======================================================================
// 🔐 GOVERNANCE TRANSLATOR – FASE C7 / B3
// ----------------------------------------------------------------------
// Traduce la política C7 a reglas internas para el kernel.
// ❌ No genera texto visible
// ❌ No evalúa hechos
// ======================================================================

function block(lines = []) {
  return lines.filter(Boolean).join("\n");
}

export function translateGovernancePolicy(policy = {}) {
  if (!policy || policy.disclosureLevel === "none") {
    return "";
  }

  const rules = [];

  rules.push("GOVERNANCE (INTERNO – NO MENCIONAR):");

  // ------------------------------------------------------------
  // Nivel de revelación
  // ------------------------------------------------------------
  if (policy.disclosureLevel === "soft") {
    rules.push(
      "- Revela observaciones solo de forma prudente y no concluyente.",
      "- Evita lenguaje categórico o acusatorio."
    );
  }

  if (policy.disclosureLevel === "explicit") {
    rules.push(
      "- Expón los vicios detectados con precisión técnica.",
      "- No exageres consecuencias ni asegures resultados."
    );
  }

  // ------------------------------------------------------------
  // Tono de guía
  // ------------------------------------------------------------
  if (policy.guidanceTone === "prudente") {
    rules.push(
      "- Usa advertencias técnicas y lenguaje mesurado.",
      "- Reconoce márgenes de discrecionalidad judicial."
    );
  }

  if (policy.guidanceTone === "directivo") {
    rules.push(
      "- Prioriza claridad estratégica.",
      "- Señala con firmeza las implicancias procesales."
    );
  }

  // ------------------------------------------------------------
  // Consejo procedimental
  // ------------------------------------------------------------
  if (!policy.allowProceduralAdvice) {
    rules.push(
      "- No sugieras acciones procesales concretas.",
      "- Limítate a observaciones generales."
    );
  }

  // ------------------------------------------------------------
  // Escalamiento
  // ------------------------------------------------------------
  if (policy.escalation) {
    rules.push(
      "- Recomienda revisión humana directa.",
      "- Advierte que el análisis puede variar según el criterio judicial."
    );
  }

  return block(rules);
}
