// ======================================================================
// 🧠 TagTTL.js — R7.7 (Canonical Stable)
// ----------------------------------------------------------------------
// Temporal semantic memory manager for LITIS.
// RESPONSIBILITIES:
// - TTL enforcement
// - Sliding-window hierarchical control
// - Tag age tracking (no inference)
// - Inertia signature generation
// ======================================================================

/**
 * Keeps only the last N tags for a given level.
 */
export function limitTags(tags = [], max = 3) {
  return tags.slice(-max);
}

/**
 * Removes duplicates while preserving insertion order.
 */
export function unique(tags = []) {
  return [...new Set(tags)];
}

/**
 * Purges expired tags based on TTL.
 */
export function purgeExpiredTags(prevTags, prevAges, turnCount, TTL = 5) {
  const nextTags = { dominio: [], objeto: [], proceso: [] };
  const nextAges = { dominio: {}, objeto: {}, proceso: {} };

  for (const level of ["dominio", "objeto", "proceso"]) {
    for (const tag of prevTags[level] || []) {
      const age = prevAges[level]?.[tag] ?? turnCount;
      const expired = turnCount - age >= TTL;

      if (!expired) {
        nextTags[level].push(tag);
        nextAges[level][tag] = age;
      }
    }
  }

  return { tags: nextTags, ages: nextAges };
}

/**
 * Generates stability weights based on tag persistence.
 * (Inertia signature for affinity engine)
 */
export function computeInertiaBoost(prevAges, turnCount) {
  const weights = { dominio: 1, objeto: 1, proceso: 1 };

  for (const level of ["dominio", "objeto", "proceso"]) {
    const ages = Object.values(prevAges[level] || {});
    if (!ages.length) continue;

    const oldestTurn = Math.min(...ages);
    const persistence = turnCount - oldestTurn;

    // Max inertia boost is +20%
    const boost = Math.min(persistence * 0.04, 0.20);
    weights[level] = 1 + boost;
  }

  return weights;
}

/**
 * Fusion between previous and current hierarchical tags.
 */
export function mergeHierarchicalTags(previous, current) {
  return {
    dominio: limitTags(unique([...(previous.dominio || []), ...(current.dominio || [])])),
    objeto: limitTags(unique([...(previous.objeto || []), ...(current.objeto || [])])),
    proceso: limitTags(unique([...(previous.proceso || []), ...(current.proceso || [])])),
  };
}

/**
 * Updates tag age registry for the current turn.
 */
export function updateTagAges(finalTags, prevAges, turnCount) {
  const nextAges = { dominio: {}, objeto: {}, proceso: {} };

  for (const level of ["dominio", "objeto", "proceso"]) {
    for (const tag of finalTags[level]) {
      nextAges[level][tag] = prevAges[level]?.[tag] ?? turnCount;
    }
  }

  return nextAges;
}

export default {
  limitTags,
  unique,
  purgeExpiredTags,
  computeInertiaBoost,
  mergeHierarchicalTags,
  updateTagAges,
};
