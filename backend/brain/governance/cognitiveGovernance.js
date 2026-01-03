// ======================================================================
// 🔐 COGNITIVE GOVERNANCE ENGINE – FASE C7
// ----------------------------------------------------------------------
// Decide CUÁNTO, CÓMO y CUÁNDO revelar análisis interno.
// ❌ No genera texto
// ❌ No analiza hechos
// ❌ No evalúa lógica
// ======================================================================

export function applyCognitiveGovernance({
  wantsAnalysis = false,
  proceduralRecommendation = null,
  cognitiveProfile = {},
  context = {},
}) {
  // ------------------------------------------------------------
  // 0) Default absoluto (silencio estratégico)
  // ------------------------------------------------------------
  const policy = {
    disclosureLevel: "none", // none | soft | explicit
    guidanceTone: "neutral", // neutral | prudente | directivo
    allowProceduralAdvice: false,
    escalation: false,
    silenceReason: "default_silence",
  };

  if (!proceduralRecommendation) {
    policy.silenceReason = "no_procedural_signal";
    return policy;
  }

  const {
    vicio = "indeterminado",
    riesgo = "medio",
  } = proceduralRecommendation;

  const profundidad = cognitiveProfile?.profundidad || "media";

  // ------------------------------------------------------------
  // 1) Usuario NO pidió análisis
  // ------------------------------------------------------------
  if (!wantsAnalysis) {
    policy.disclosureLevel = "soft";
    policy.guidanceTone = "prudente";
    policy.allowProceduralAdvice = false;
    policy.silenceReason = "analysis_not_requested";
    return policy;
  }

  // ------------------------------------------------------------
  // 2) Análisis pedido + vicio leve
  // ------------------------------------------------------------
  if (vicio === "leve") {
    policy.disclosureLevel = "soft";
    policy.guidanceTone = "neutral";
    policy.allowProceduralAdvice = true;
    policy.silenceReason = "minor_issue";
    return policy;
  }

  // ------------------------------------------------------------
  // 3) Análisis pedido + vicio medio
  // ------------------------------------------------------------
  if (vicio === "medio") {
    policy.disclosureLevel = "explicit";
    policy.guidanceTone = "prudente";
    policy.allowProceduralAdvice = true;

    if (riesgo === "alto") {
      policy.escalation = true;
    }

    policy.silenceReason = "moderate_issue";
    return policy;
  }

  // ------------------------------------------------------------
  // 4) Vicio grave
  // ------------------------------------------------------------
  if (vicio === "grave") {
    policy.disclosureLevel = "explicit";
    policy.guidanceTone = "directivo";
    policy.allowProceduralAdvice = true;
    policy.escalation = true;
    policy.silenceReason = "serious_violation";
    return policy;
  }

  // ------------------------------------------------------------
  // 5) Fallback seguro
  // ------------------------------------------------------------
  policy.silenceReason = "fallback_safe";
  return policy;
}
