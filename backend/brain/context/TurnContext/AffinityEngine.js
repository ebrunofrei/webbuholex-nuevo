// ======================================================================
// 🧠 AffinityEngine.js — R7.7 (Canonical Stable)
// ----------------------------------------------------------------------
// Computes semantic continuity between turns for LITIS Cognitivo.
//
// RESPONSIBILITIES:
// - Hierarchical semantic affinity (domain > object > process)
// - Cross-level coherence reinforcement
// - Density multiplier (semantic richness)
// - Orphan penalty (weak/no continuity)
// - Inertia-weight enhancement (from TagTTL)
//
// NON-RESPONSIBILITIES:
// - No reset decisions
// - No tag aging
// - No intent detection
// - No LTM logic
//
// INTERNAL LANGUAGE: English only
// ======================================================================

/**
 * Base hierarchical weights (must sum to 1).
 */
const BASE_WEIGHTS = {
  dominio: 0.45,
  objeto: 0.40,
  proceso: 0.15,
};

/**
 * Computes level affinity for a single hierarchical level.
 */
function levelAffinity(currentLevel = [], previousLevel = []) {
  if (!previousLevel.length) return 0;

  const inter = currentLevel.filter(t => previousLevel.includes(t));
  return inter.length / previousLevel.length;
}

/**
 * Reinforces coherence across hierarchy levels.
 * Object ↔ Process and Domain ↔ Object relationships.
 */
function crossLevelSignal(current, previous) {
  let score = 0;

  const objectMatch = current.objeto.some(o => previous.objeto.includes(o));
  const processMatch = current.proceso.some(p => previous.proceso.includes(p));

  // Object ↔ Process coherence (e.g., judgment + appeal)
  if (objectMatch && processMatch) score += 0.10;

  // Domain ↔ Object coherence
  if (
    current.dominio.length &&
    previous.dominio.length &&
    current.objeto.length &&
    previous.objeto.length
  ) {
    score += 0.05;
  }

  return score;
}

/**
 * Semantic density multiplier.
 */
function densitySignal(current) {
  const count =
    (current.dominio?.length || 0) +
    (current.objeto?.length || 0) +
    (current.proceso?.length || 0);

  if (count >= 4) return 1.10;
  if (count >= 2) return 1.05;
  return 1.0;
}

/**
 * Penalty for weak/no continuity.
 */
function orphanPenalty(current, previous) {
  const flatCurrent = [
    ...current.dominio,
    ...current.objeto,
    ...current.proceso,
  ];

  const flatPrevious = [
    ...previous.dominio,
    ...previous.objeto,
    ...previous.proceso,
  ];

  // No semantic signal at all
  if (!flatCurrent.length) return -0.05;

  const matches = flatCurrent.filter(t => flatPrevious.includes(t));

  // Single isolated tag → weak signal
  if (matches.length === 0 && flatCurrent.length === 1) {
    return -0.10;
  }

  return 0;
}

/**
 * MAIN ENGINE — R7.7 (Canonical)
 *
 * @param {Object} params
 * @param {Object} params.current       - Current hierarchical tags
 * @param {Object} params.previous      - TTL-cleaned hierarchical tags
 * @param {Object} params.previousAges  - (Unused) kept for interface stability
 * @param {number} params.turnCount     - (Unused) kept for interface stability
 * @param {Object} params.weights       - Inertia weights (from TagTTL)
 *
 * @returns {number} affinity score ∈ [0, 1]
 */
export function computeAffinity({
  current,
  previous,
  previousAges = {},
  turnCount,
  weights = { dominio: 1, objeto: 1, proceso: 1 },
}) {
  let score = 0;

  // Hierarchical affinity
  for (const lvl of ["dominio", "objeto", "proceso"]) {
    const baseAff = levelAffinity(current[lvl], previous[lvl]);

    const weighted =
      baseAff *
      BASE_WEIGHTS[lvl] *
      (weights[lvl] || 1);

    score += weighted;
  }

  // Cross-level reinforcement
  score += crossLevelSignal(current, previous);

  // Density multiplier
  score *= densitySignal(current);

  // Orphan penalty
  score += orphanPenalty(current, previous);

  // Clamp final value
  return Math.max(0, Math.min(score, 1));
}

export default {
  computeAffinity,
};
