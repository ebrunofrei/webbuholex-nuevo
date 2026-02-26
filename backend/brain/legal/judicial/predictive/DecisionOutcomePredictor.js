// brain/legal/judicial/predictive/DecisionOutcomePredictor.js

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

function riskLevel(prob) {
  if (prob >= 0.75) return "bajo";
  if (prob >= 0.55) return "medio";
  return "alto";
}

function inferJudgeProfile({ contradictions, semanticCoherence, rhetoricAnalysis }) {
  const highLogicalIssues =
    (contradictions?.summary?.high || 0) +
    (semanticCoherence?.summary?.high || 0);

  if (highLogicalIssues > 1) return "formalista";
  if ((rhetoricAnalysis?.summary?.score || 0) > 75) return "garantista";
  return "mixto";
}

export function predictDecisionOutcome({
  score,
  penalties,
  jurisprudenceAlignment,
  contradictions,
  semanticCoherence,
  rhetoricAnalysis,
  docType,
}) {
  const baseProb = score / 100;

  const jurisFactor = clamp(
    (jurisprudenceAlignment?.bestScore || 0),
    0,
    1
  );

  const logicalPenalty =
    ((contradictions?.summary?.critical || 0) * 0.15) +
    ((semanticCoherence?.summary?.critical || 0) * 0.12);

  const rhetoricBoost =
    (rhetoricAnalysis?.summary?.score || 0) > 80 ? 0.05 : 0;

  let probability =
    baseProb * 0.6 +
    jurisFactor * 0.25 +
    rhetoricBoost -
    logicalPenalty;

  probability = clamp(probability, 0, 1);

  const judgeProfile = inferJudgeProfile({
    contradictions,
    semanticCoherence,
    rhetoricAnalysis,
  });

  const factors = [];

  if (jurisFactor > 0.85) {
    factors.push("Fuerte alineación jurisprudencial.");
  }

  if ((contradictions?.summary?.critical || 0) > 0) {
    factors.push("Existen contradicciones críticas.");
  }

  if ((semanticCoherence?.summary?.critical || 0) > 0) {
    factors.push("Incoherencia semántica relevante.");
  }

  if ((rhetoricAnalysis?.summary?.score || 0) > 80) {
    factors.push("Alta calidad retórica.");
  }

  return {
    probabilidadExito: Number(probability.toFixed(2)),
    nivelRiesgo: riskLevel(probability),
    perfilJuezProbable: judgeProfile,
    factoresClave: factors,
    modeloVersion: "1.0-heuristico-explicable",
  };
}