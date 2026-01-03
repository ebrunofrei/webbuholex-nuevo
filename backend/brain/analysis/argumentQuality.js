// ======================================================================
// 🧠 ARGUMENT QUALITY AGGREGATOR – LITISBOT (FASE B3)
// ----------------------------------------------------------------------
// Integra:
// - Coherencia lógica (B1)
// - Detección de falacias (B2)
// - Perfil cognitivo
//
// ❌ No corrige
// ❌ No responde
// ❌ No explica
// Devuelve evaluación interna unificada.
// ======================================================================

import { scoreCoherence } from "./coherenceScorer.js";
import { detectFallacies } from "./fallacyDetector.js";

/* ======================================================================
   CLASIFICACIÓN DE RIESGO
====================================================================== */

function classifyRisk(score, fallacies = []) {
  const highSeverity = fallacies.some(
    (f) => f.severity === "alta"
  );

  if (score < 0.4 || highSeverity) return "alto";
  if (score < 0.7) return "medio";
  return "bajo";
}

/* ======================================================================
   AGREGADOR PRINCIPAL
====================================================================== */

export function evaluateArgumentQuality({
  prompt = "",
  draft = "",
  cognitiveProfile = {},
}) {
  // ------------------------------
  // 1️⃣ Coherencia lógica
  // ------------------------------
  const coherence = scoreCoherence({
    prompt,
    draft,
    cognitiveProfile,
  });

  // ------------------------------
  // 2️⃣ Falacias
  // ------------------------------
  const fallacies = detectFallacies({
    prompt,
    draft,
    cognitiveProfile,
  });

  // ------------------------------
  // 3️⃣ Score base
  // ------------------------------
  let score = coherence.score;

  // Penalización por falacias
  if (fallacies.detected.length) {
    fallacies.detected.forEach((f) => {
      if (f.severity === "alta") score -= 0.15;
      if (f.severity === "media") score -= 0.08;
      if (f.severity === "baja") score -= 0.03;
    });
  }

  // Ajuste por perfil cognitivo
  if (cognitiveProfile?.rigor) {
    score -= fallacies.detected.length * 0.02;
  }

  score = Math.max(0, Math.min(1, Number(score.toFixed(2))));

  // ------------------------------
  // 4️⃣ Clasificación de riesgo
  // ------------------------------
  const riskLevel = classifyRisk(score, fallacies.detected);

  // ------------------------------
  // 5️⃣ Flags internas
  // ------------------------------
  const flags = {
    requiresRevision: score < 0.6,
    highLogicalRisk: riskLevel === "alto",
    hasFallacies: fallacies.detected.length > 0,
  };

  return {
    score,
    riskLevel,
    coherence,
    fallacies,
    flags,
  };
}
