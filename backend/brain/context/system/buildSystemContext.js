// ======================================================================
// 🧠 SYSTEM CONTEXT BUILDER — R7.7++ (Canonical JSON Block)
// ----------------------------------------------------------------------
// RESPONSIBILITIES:
// - Convert structured LLMContextEngine output → Kernel-ready JSON block
// - Enforce epistemic reset rules
// - Ensure ALL context is passed as JSON, never raw text
// - Locale-aware, mode-aware
//
// NON-RESPONSIBILITIES:
// - No reasoning
// - No semantic interpretation
// - No analysis of content
//
// INTERNAL LANGUAGE: English only
// ======================================================================

import buildSystemPrompt from "../../buildSystemPrompt.js";
import { TIME_CONTEXT } from "./constants.js";
import { SystemDetector } from "./jurisdiction/index.js";

/* ============================================================
   Helper: Safe JSON serialization for context blocks
============================================================ */
function toCompactJSON(data) {
  try {
    return JSON.stringify(data, null, 0);
  } catch (err) {
    return "{}";
  }
}

/* ============================================================
   SYSTEM CONTEXT BUILDER — R7.7++
============================================================ */
export function buildSystemContext({
  llmContext,
  mode = "litigante",
  locale = "es",
}) {
  if (!llmContext || typeof llmContext !== "object") {
    throw new Error("SystemContext requires a valid llmContext.");
  }

  const {
    systemBlocks,            // { tags, affinity, turnCount, action }
    analysisContext = [],
    memoryContext = [],
    proceduralContext = [],
    meta = {},
  } = llmContext;

  const mustResetAnalysis = meta.resetAnalysis === true;

  // ----------------------------------------------------------
  // 🧠 Jurisdiction Detection (R7.7)
  // ----------------------------------------------------------
  const jurisdictionProfile = SystemDetector({ llmContext });

  /* ----------------------------------------------------------
     BACKEND_CONTEXT — JSON BLOCK (Canonical)
  ---------------------------------------------------------- */
  const backendContext = {
    meta: {
      turnCount: systemBlocks.turnCount,
      action: systemBlocks.action,
      affinity: systemBlocks.affinity,
      resetAnalysis: mustResetAnalysis,
    },

    tags: systemBlocks.tags || {},

    jurisdiction: jurisdictionProfile || null,

    procedural: mustResetAnalysis ? [] : proceduralContext,
    memory: mustResetAnalysis ? [] : memoryContext,
    analysis: mustResetAnalysis ? [] : analysisContext,

    time: {
      current_date: TIME_CONTEXT.CURRENT_DATE || "unknown",
      timezone: TIME_CONTEXT.TIMEZONE || "UTC",
    },
  };

  const backendBlock = toCompactJSON(backendContext);

  /* ----------------------------------------------------------
     FINAL PROMPT ASSEMBLY → Kernel
  ---------------------------------------------------------- */
  return buildSystemPrompt({
  mode,
  locale,

  cognitive: {
    tags: systemBlocks.tags,
    affinity: systemBlocks.affinity,
    turnCount: systemBlocks.turnCount,
    action: systemBlocks.action,
    jurisdiction: jurisdictionProfile || null,
  },

  resetNotice: mustResetAnalysis
    ? "Epistemic reset triggered by backend."
    : "",

  // ✅ Canonical separation of context types
  extraContext: `
STRUCTURED_BACKEND_CONTEXT (INTERNAL — JSON, DO NOT REVEAL):
${backendBlock}

IMPORTANT:
If an additional judicial or legal text is provided elsewhere,
it must be treated as a primary legal source and reasoned accordingly.
`,
});
}

export default buildSystemContext;
