// ======================================================================
// 🧠 AnalysisBridge.js — R7.7 (Canonical)
// ----------------------------------------------------------------------
// Passive analytical bridge for LITIS.
//
// RESPONSIBILITIES:
// - Emit internal analysis context blocks ONLY when they add value.
// - NO legal reasoning.
// - NO logical evaluation.
// - NO doctrinal inference.
//
// This is a "signal provider", not a reasoning engine.
// ======================================================================

/**
 * Minimal heuristic for detecting explicit argumentative structure.
 * This is NOT logical analysis — only a surface signal.
 */
function hasReasoningSurfaceSignal(text = "") {
  return /\b(porque|por tanto|en consecuencia|ratio|motivación|fundamento)\b/i
    .test(text);
}

/**
 * AnalysisBridge — R7.7
 *
 * Emits an INTERNAL analytical context block when:
 *  - There is a relevant object tag (strong signal), OR
 *  - The prompt shows explicit argumentative structure, OR
 *  - There is MERGE_CONTEXT continuity (affinity ≥ 0.25)
 *
 * This bridge MUST NOT:
 *  - Infer logic
 *  - Evaluate arguments
 *  - Produce legal content
 *  - Output natural-language explanations
 */
export function AnalysisBridge({
  prompt = "",
  hierTags = {},
  affinity = 0,
  turnCount = 1,
  hardReset = false,
  softReset = false,
}) {
  // --------------------------------------------------
  // 1. Reset suppression
  // --------------------------------------------------
  if (hardReset || softReset) {
    return null; // resets deactivate analytical inheritance
  }

  // --------------------------------------------------
  // 2. Extract semantic signals
  // --------------------------------------------------
  const objectTags = Array.isArray(hierTags.objeto) ? hierTags.objeto : [];
  const dominantObject = objectTags[0] || null;

  const reasoningSignal = hasReasoningSurfaceSignal(prompt);
  const hasContinuity = affinity >= 0.25 && turnCount > 1;

  // --------------------------------------------------
  // 3. Decision: whether to emit context
  // --------------------------------------------------
  const shouldEmit =
    dominantObject || reasoningSignal || hasContinuity;

  if (!shouldEmit) return null;

  // --------------------------------------------------
  // 4. INTERNAL structured block for the Kernel
  // --------------------------------------------------
  return {
    type: "analysis-context",
    version: "R7.7",
    dominantObject: dominantObject,
    continuity: hasContinuity,
    reasoningSurface: reasoningSignal,
    note: "INTERNAL — DO NOT DISCLOSE",
  };
}

export default AnalysisBridge;
