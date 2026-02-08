// ============================================================================
// LITIS | Bubble Closure Builder — R7.8 (Plan-aware)
// ----------------------------------------------------------------------------
// - BUILDS session-level notices (NOT chat text)
// - NEVER injects content into the LLM reply
// - Copy aligned with user plan (Free / Pro / Enterprise)
// - Used ONLY to signal analysis boundaries to the UI
// ============================================================================

/**
 * Determines whether an analysis boundary applies.
 * Evaluation happens in the handler.
 */
export function shouldApplyLegalBoundary({
  isAdvancedLegalReasoning = false,
} = {}) {
  return Boolean(isAdvancedLegalReasoning);
}

/**
 * Builds a SESSION NOTE (badge / notice).
 * This is NOT a chat response.
 */
export function buildBubbleLegalClosure({
  language = "es",
  plan = "bubble_free",
} = {}) {
  const copyByPlan = {
    bubble_free: {
      es: "Has alcanzado el límite diario de análisis jurídico avanzado. Puedes seguir conversando libremente o desbloquear análisis completo con LitisBot Pro.",
      en: "You’ve reached today’s advanced legal analysis limit. You can keep chatting freely or unlock full analysis with LitisBot Pro.",
      pt: "Você atingiu o limite diário de análise jurídica avançada. Pode continuar conversando ou desbloquear a análise completa com o plano Pro.",
      fr: "Vous avez atteint la limite quotidienne d’analyse juridique avancée. Vous pouvez continuer à discuter ou débloquer l’analyse complète avec Pro.",
      it: "Hai raggiunto il limite giornaliero di analisi giuridica avanzata. Puoi continuare a conversare o sbloccare l’analisi completa con Pro.",
      de: "Sie haben das tägliche Limit für vertiefte juristische Analyse erreicht. Sie können weiter chatten oder die vollständige Analyse mit Pro freischalten.",
    },

    pro: {
      es: "Has alcanzado el límite diario de análisis jurídico avanzado. El análisis se reactivará automáticamente mañana. Puedes seguir conversando en este chat.",
      en: "You’ve reached today’s advanced legal analysis limit. Analysis will be available again tomorrow. You may continue chatting.",
      pt: "Você atingiu o limite diário de análise jurídica avançada. A análise será reativada automaticamente amanhã.",
      fr: "Vous avez atteint la limite quotidienne d’analyse juridique avancée. L’analyse sera de nouveau disponible demain.",
      it: "Hai raggiunto il limite giornaliero di analisi giuridica avanzata. L’analisi sarà nuovamente disponibile domani.",
      de: "Sie haben das tägliche Limit für vertiefte juristische Analyse erreicht. Die Analyse ist morgen wieder verfügbar.",
    },

    enterprise: null, // 🚫 No mostramos badge por defecto
  };

  const planCopy = copyByPlan[plan];

  if (!planCopy) return null;

  return {
    type: "analysis_boundary",
    scope: "advanced_analysis",
    level: "info",
    plan,
    message: planCopy[language] || planCopy.es,
  };
}
