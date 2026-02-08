// ======================================================================
// 🧠 LTMBridge.js — R7.7++ (Canonical)
// ----------------------------------------------------------------------
// Passive long-term memory bridge for LITIS.
//
// RESPONSIBILITIES:
// - Provide LTM metadata ONLY IF externally supplied.
// - Never override current turn context.
// - Never decide relevance or perform cross-domain reasoning.
// - Emit structured INTERNAL signals only.
//
// NON-RESPONSIBILITIES:
// - No reasoning.
// - No summarization.
// - No semantic comparison beyond basic alignment flag.
// - No human-readable output.
// ======================================================================

/**
 * LTMBridge — R7.7
 *
 * @param {Object} params
 * @param {Object|null} params.longTermMemory
 * @param {Object} params.hierTags
 * @param {number} params.affinity
 *
 * @returns {Object|null} INTERNAL block for SystemContext
 */
export function LTMBridge({
  longTermMemory = null,
  hierTags = {},
  affinity = 0,
}) {
  // --------------------------------------------------
  // 1. LTM must exist and contain minimal structure
  // --------------------------------------------------
  if (!longTermMemory || typeof longTermMemory !== "object") return null;

  const summary = longTermMemory.summary;
  const tags = Array.isArray(longTermMemory.tags)
    ? longTermMemory.tags
    : [];

  const relevanceScore = Number(longTermMemory.relevanceScore || 0);

  if (!summary || typeof summary !== "string") return null;

  // --------------------------------------------------
  // 2. Basic cross-domain check (non-decisive)
  // --------------------------------------------------
  const currentObj = Array.isArray(hierTags.objeto)
    ? hierTags.objeto
    : [];

  const crossDomain =
    currentObj.length && tags.length
      ? !tags.some((t) => currentObj.includes(t))
      : false;

  // --------------------------------------------------
  // 3. Structured INTERNAL block
  // --------------------------------------------------
  return {
    type: "ltm-context",
    version: "R7.7",
    summary,
    relevanceScore,
    tags,
    crossDomain,
    affinity,
    internal: true, // explicit mark for Kernel
  };
}

export default LTMBridge;
