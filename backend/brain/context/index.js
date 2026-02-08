// ============================================================================
// 🧠 LITIS KERNEL R7.6++ — Cognitive Entry Point (I18N Ready)
// ----------------------------------------------------------------------------
// Orchestrates:
// Language → Intent → Resolver → ContextEngine → Bridges → SystemContext → Kernel
//
// This is the only place where:
// - User language is detected
// - Non-legal intents are diverted safely
// - Legal contexts are processed cognitively
// ============================================================================

import detectIntent from "../../intentRouter.js";
import detectLanguage from "../i18n/languageDetector.js";

import { resolveTurnContext } from "../TurnContext/Resolver.js";
import { buildLLMContext } from "../Engine/LLMContextEngine.js";

// Bridges (cognitive tools)
import { AnalysisBridge } from "../Engine/AnalysisBridge.js";
import { ProceduralBridge } from "../Engine/ProceduralBridge.js";
import { PDFBridge } from "../Engine/PDFBridge.js";
import { LTMBridge } from "../Engine/LTMBridge.js";

// Non-kernel responses
import { handleSystemIntent } from "../System/handleSystemIntent.js";

/**
 * Main cognitive pipeline.
 * Returns:
 *  - locale → user language
 *  - turnContext → semantic state
 *  - llmContext → cognitive blocks for Kernel
 */
export async function processLitisTurn({
  userMessage,
  previousTurnContext,
  lastLLMContext,
  adjuntos = [],
  longTermMemory = null,
}) {
  // ------------------------------------------------------------------
  // 0️⃣ LANGUAGE DETECTION — First and unavoidable
  // ------------------------------------------------------------------
  const locale = detectLanguage(userMessage || "");

  // ------------------------------------------------------------------
  // 1️⃣ INTENT DETECTION — Cognitive Firewall
  // ------------------------------------------------------------------
  const intent = detectIntent({
    prompt: userMessage,
    adjuntos,
  });

  // If the intent is not legal → redirect to system handler
  if (intent.intent !== "consulta_juridica" && !intent.forceTool) {
    return handleSystemIntent({
      intent,
      userMessage,
      previousTurnContext,
      locale, // used by system responses too
    });
  }

  // ------------------------------------------------------------------
  // 2️⃣ SEMANTIC RESOLUTION — TurnContext
  // ------------------------------------------------------------------
  const turnContext = resolveTurnContext({
    userMessage,
    previousTurnContext,
  });

  // ------------------------------------------------------------------
  // 3️⃣ Cognitive Bridges (passive tools)
  // ------------------------------------------------------------------
  const bridges = {
    AnalysisBridge,
    ProceduralBridge,
    PDFBridge,
    LTMBridge,
  };

  // ------------------------------------------------------------------
  // 4️⃣ LLM CONTEXT ENGINE — Cognitive Assembly
  // ------------------------------------------------------------------
  const llmContext = buildLLMContext({
    turnContext,
    lastLLMContext,
    bridges,
    prompt: userMessage,
    adjuntos,
    longTermMemory,
  });

  // ------------------------------------------------------------------
  // 5️⃣ Canonical Return — The Kernel receives EVERYTHING it needs
  // ------------------------------------------------------------------
  return {
    locale,       // ← language of the user (critical for multilingual Kernel)
    turnContext,  // ← semantic state (domain/object/process/tags/reset)
    llmContext,   // ← cognitive blocks prepared for SystemContextBuilder
  };
}

export default { processLitisTurn };
