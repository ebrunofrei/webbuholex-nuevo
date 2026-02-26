// ============================================================================
// 🏛 JudicialDecisionSimulator — Simulador de Magistrado
// ----------------------------------------------------------------------------
// Evalúa si el escrito es persuasivo desde perspectiva decisional.
// No reescribe. No embellece.
// Simula cómo lo leería un juez.
// ============================================================================

import { splitParagraphs } from "../text/textHelpers.js";
import { hasLegalCitation, hasMotivation } from "../text/textHelpers.js";

export function simulateJudicialReading(raw = "") {
  const text = String(raw || "");
  const paragraphs = splitParagraphs(text);

  const result = {
    decisionalClarity: 0,
    weakPoints: [],
    strengths: [],
    simulatedOutcome: null,
  };

  const lower = text.toLowerCase();

  const hasPetition =
    lower.includes("petitorio") ||
    lower.includes("solicito") ||
    lower.includes("pretensión");

  const hasNorm = hasLegalCitation(text);
  const hasReasoning = hasMotivation(text);

  if (hasPetition) {
    result.strengths.push("La pretensión es identificable.");
    result.decisionalClarity += 25;
  } else {
    result.weakPoints.push("No se identifica con claridad qué debe decidir el órgano jurisdiccional.");
  }

  if (hasNorm) {
    result.strengths.push("Existe referencia normativa.");
    result.decisionalClarity += 25;
  } else {
    result.weakPoints.push("No se invoca norma aplicable de forma expresa.");
  }

  if (hasReasoning) {
    result.strengths.push("Se aprecia intento de motivación jurídica.");
    result.decisionalClarity += 25;
  } else {
    result.weakPoints.push("No hay motivación jurídica suficiente.");
  }

  if (paragraphs.length >= 4) {
    result.decisionalClarity += 15;
  } else {
    result.weakPoints.push("Desarrollo argumentativo insuficiente.");
  }

  // Simulación simple de resultado
  if (result.decisionalClarity >= 75) {
    result.simulatedOutcome = "Alta probabilidad de decisión favorable.";
  } else if (result.decisionalClarity >= 50) {
    result.simulatedOutcome = "Probabilidad media. Requiere reforzar fundamentación.";
  } else {
    result.simulatedOutcome = "Baja probabilidad. Argumentación insuficiente.";
  }

  return result;
}