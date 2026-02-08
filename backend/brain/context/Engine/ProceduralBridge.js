// ======================================================================
// 🧠 ProceduralBridge.js — R7.7 (Canonical)
// ----------------------------------------------------------------------
// Passive procedural bridge for LITIS.
//
// RESPONSIBILITIES:
// - Emit small internal blocks indicating procedural relevance.
// - Never decide admissibility, timing, or vices.
// - Never generate legal reasoning.
//
// NON-RESPONSIBILITIES:
// - No evaluation of procedural defects.
// - No interpretation of procedural strategy.
// - No doctrinal or jurisprudential content.
//
// INTERNAL LANGUAGE: English only
// ======================================================================

/**
 * Minimal procedural surface-signal heuristic.
 * NOTE: This is NOT procedural reasoning — only a weak cue.
 */
function hasProceduralSurfaceSignal(text = "") {
  return /\b(recurso|apelaci[oó]n|nulidad|plazo|impugna|caducidad|actuaci[oó]n|notificaci[oó]n)\b/i
    .test(text);
}

/**
 * ProceduralBridge — R7.7
 *
 * Emits an INTERNAL block only when:
 *  - Procedural tags exist (strong semantic signal), OR
 *  - Linguistic cues indicate procedural context, OR
 *  - There is contextual continuity (affinity ≥ 0.25)
 *
 * All resets disable the bridge.
 */
export function ProceduralBridge({
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
  if (hardReset || softReset) return null;

  // --------------------------------------------------
  // 2. Semantic and linguistic signals
  // --------------------------------------------------
  const processTags = Array.isArray(hierTags.proceso)
    ? hierTags.proceso
    : [];

  const hasProcessTag = processTags.length > 0;
  const linguisticCue = hasProceduralSurfaceSignal(prompt);

  const continuity = affinity >= 0.25 && turnCount > 1;

  // --------------------------------------------------
  // 3. Emit only if relevant
  // --------------------------------------------------
  const shouldEmit = hasProcessTag || linguisticCue || continuity;
  if (!shouldEmit) return null;

  // --------------------------------------------------
  // 4. Structured INTERNAL block for the Kernel
  // --------------------------------------------------
  return {
    type: "procedural-context",
    version: "R7.7",
    processTags: hasProcessTag ? processTags : [],
    linguisticCue,
    continuity,
    note: "INTERNAL — DO NOT DISCLOSE",
  };
}

export default ProceduralBridge;
