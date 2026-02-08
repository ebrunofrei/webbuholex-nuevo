// ============================================================================
// 🧠 ARGUMENT QUALITY AGGREGATOR – LITISBOT (C1 · R2 ENTERPRISE)
// ----------------------------------------------------------------------------
// Integra:
//
//   • Coherencia lógica estructural        → scoreCoherence()
//   • Detección de fallacias               → detectFallacies()
//   • Métricas del discurso                → computeArgumentMetrics()
//   • Perfil cognitivo del jurista         → ajustes finos
//
// NO:
//   ❌ genera texto visible
//   ❌ corrige estilo
//   ❌ reemplaza razonamiento del kernel
//
// Produce evaluación estructural para C2–C5.
// ============================================================================

import { scoreCoherence } from "./coherenceScorer.js";
import { detectFallacies } from "./fallacyDetector.js";
import { computeArgumentMetrics } from "./metrics.js";

/* ============================================================================
   CLASSIFICADOR DE RIESGO (C1 INTERNAL)
============================================================================ */

function classifyRisk({ score, fallacies, metrics }) {
  const hasSevereFallacy = fallacies.some((f) => f.severity === "alta");
  const extremeImbalance = metrics.argumentDensity < 0.18;

  if (score < 0.45 || hasSevereFallacy) return "alto";
  if (score < 0.70 || extremeImbalance) return "medio";
  return "bajo";
}

/* ============================================================================
   AGREGADOR PRINCIPAL (C1)
============================================================================ */

export function evaluateArgumentQuality({
  prompt = "",
  cognitiveProfile = {},
}) {
  const text = String(prompt || "").trim();

  // ---------------------------------------------
  // 1️⃣ COHERENCIA LÓGICA ESTRUCTURAL — B1
  // ---------------------------------------------
  const coherence = scoreCoherence({
    prompt: text,
    cognitiveProfile,
  });

  // ---------------------------------------------
  // 2️⃣ FALACIAS — B2
  // ---------------------------------------------
  const fallacyReport = detectFallacies({
    prompt: text,
    cognitiveProfile,
  });

  const fallacies = fallacyReport.detected ?? [];

  // ---------------------------------------------
  // 3️⃣ MÉTRICAS OBJETIVAS — B3
  // ---------------------------------------------
  const metrics = computeArgumentMetrics({ texto: text });

  // ---------------------------------------------
  // 4️⃣ SCORE INTEGRADO (C1)
  // ---------------------------------------------
  let score = coherence.score ?? 1;

  // Penalización por falacias (ponderada)
  for (const f of fallacies) {
    if (f.severity === "alta") score -= 0.15;
    else if (f.severity === "media") score -= 0.08;
    else score -= 0.03;
  }

  // Ajuste si el perfil exige rigor extremo
  if (cognitiveProfile?.rigor && fallacies.length) {
    score -= fallacies.length * 0.02;
  }

  // Penalizar baja densidad argumentativa
  if (metrics.argumentDensity < 0.15) {
    score -= 0.05;
  }

  // Rango matemático [0,1]
  score = Math.max(0, Math.min(1, Number(score.toFixed(2))));

  // ---------------------------------------------
  // 5️⃣ RISK LEVEL
  // ---------------------------------------------
  const riskLevel = classifyRisk({ score, fallacies, metrics });

  // ---------------------------------------------
  // 6️⃣ FLAGS PARA C2–C5
  // ---------------------------------------------
  const flags = {
    requiresRevision: score < 0.60,
    highLogicalRisk: riskLevel === "alto",
    hasFallacies: fallacies.length > 0,
    structuralWeakness: metrics.argumentDensity < 0.18,
  };

  // ---------------------------------------------
  // 7️⃣ RETORNO CANÓNICO
  // ---------------------------------------------
  return {
    score,
    riskLevel,
    coherence,
    fallacies: fallacyReport,
    metrics,
    flags,
  };
}
