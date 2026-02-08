// ======================================================================
// 🧠 Resolver.js — TurnContextResolver R7.7 (Canonical Final)
// ----------------------------------------------------------------------
// DECISION AUTHORITY FOR TURN CONTEXT
//
// RESPONSIBILITIES:
// - Apply TTL cleanup
// - Determine semantic continuity
// - Decide context merging vs reset
// - Emit authoritative turn signals
//
// INTERNAL LANGUAGE: English only
// ======================================================================

import { ONTOLOGY } from "./Ontology.js";
import { extractHierarchicalTags } from "./TagExtractor.js";
import {
  purgeExpiredTags,
  updateTagAges,
  computeInertiaBoost,
} from "./TagTTL.js";
import { computeAffinity } from "./AffinityEngine.js";

// -------------------------------------------------------------
// 1) Explicit hard reset detection
// -------------------------------------------------------------
function detectHardReset(text = "") {
  return ONTOLOGY.hard_reset.test(String(text).toLowerCase());
}

// -------------------------------------------------------------
// 2) Ambiguous follow-up detection
// -------------------------------------------------------------
function isAmbiguousFollowUp(current, previous) {
  const hasCurrent =
    current.dominio.length ||
    current.objeto.length ||
    current.proceso.length;

  const hasPrevious =
    previous.dominio.length ||
    previous.objeto.length ||
    previous.proceso.length;

  return !hasCurrent && hasPrevious;
}

// -------------------------------------------------------------
// 3) Merge with uniqueness + sliding window
// -------------------------------------------------------------
function mergeWithLimits(previous, current, max = 3) {
  const uniq = (arr) => [...new Set(arr)];

  return {
    dominio: uniq([...previous.dominio, ...current.dominio]).slice(-max),
    objeto: uniq([...previous.objeto, ...current.objeto]).slice(-max),
    proceso: uniq([...previous.proceso, ...current.proceso]).slice(-max),
  };
}

// -------------------------------------------------------------
// ★ CORE — Turn Context Resolution
// -------------------------------------------------------------
export function resolveTurnContext({ userMessage, previousTurnContext }) {
  const text = String(userMessage || "").trim();
  const turnCount = (previousTurnContext?.turnCount || 0) + 1;

  // 1) Hard reset
  const hardReset = detectHardReset(text);

  // 2) Current hierarchical tags
  const currentTags = extractHierarchicalTags(text);

  // 3) Previous state
  const previousTags = previousTurnContext?.hierTags || {
    dominio: [],
    objeto: [],
    proceso: [],
  };

  const previousAges = previousTurnContext?.tagAges || {
    dominio: {},
    objeto: {},
    proceso: {},
  };

  // 4) TTL purge
  const {
    tags: cleanedPrevious,
    ages: cleanedAges,
  } = purgeExpiredTags(previousTags, previousAges, turnCount);

  // 5) Inertia boost
  const inertiaWeights = hardReset
    ? { dominio: 1, objeto: 1, proceso: 1 }
    : computeInertiaBoost(cleanedAges, turnCount);

  // 6) Affinity computation
  const affinity = hardReset
    ? 0
    : computeAffinity({
        current: currentTags,
        previous: cleanedPrevious,
        previousAges: cleanedAges,
        turnCount,
        weights: inertiaWeights,
      });

  const threshold = 0.30 + Math.min(turnCount * 0.015, 0.20);

  // 7) Decision
  let action = "NEW_TOPIC";
  let softReset = false;

  if (hardReset) {
    action = "HARD_RESET";
  } else if (affinity >= threshold) {
    action = "MERGE_CONTEXT";
  } else if (isAmbiguousFollowUp(currentTags, cleanedPrevious)) {
    action = "MERGE_CONTEXT";
  } else {
    action = "NEW_TOPIC";
    softReset = true;
  }

  // 8) Final tag set
  const finalTags =
    action === "MERGE_CONTEXT"
      ? mergeWithLimits(cleanedPrevious, currentTags)
      : currentTags;

  // 9) Update tag ages
  const finalAges = updateTagAges(finalTags, cleanedAges, turnCount);

  // 10) Epistemic reset logic
  const analysisReset = action !== "MERGE_CONTEXT" || softReset;

  return {
    action,
    softReset,
    hardReset,

    turnType: action === "MERGE_CONTEXT" ? "follow_up" : "new_topic",

    analysisReset,

    affinity,
    threshold,

    hierTags: finalTags,
    tagAges: finalAges,
    tags: [
      ...finalTags.dominio,
      ...finalTags.objeto,
      ...finalTags.proceso,
    ],

    turnCount,
  };
}

export default {
  resolveTurnContext,
};
