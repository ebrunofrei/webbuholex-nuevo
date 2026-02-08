// ============================================================
// 🫧 Bubble Limiter — R7.7++
// ------------------------------------------------------------
// Operational quota enforcement ONLY
// - Respects temporary unlocks (24h)
// - No payment logic
// - No UI logic
// ============================================================

import {
  getTodayUsage,
  incrementUsage,
} from "./bubbleUsageRepo.js";

/**
 * @param {string} usuarioId
 * @param {"simple"|"legal_analysis"|"deep_analysis"} type
 * @param {Record<string, number>} limits
 * @param {Object|null} analysisUnlock  // 👈 NUEVO
 */
export async function checkBubbleQuota(
  usuarioId,
  type,
  limits = {},
  analysisUnlock = null
) {
  // ------------------------------------
  // 0. Unlocked window bypasses quota
  // ------------------------------------
  if (
    analysisUnlock?.activeUntil &&
    new Date(analysisUnlock.activeUntil) > new Date()
  ) {
    return {
      allowed: true,
      remaining: Infinity,
      unlocked: true,
    };
  }

  // ------------------------------------
  // 1. Defensive guards
  // ------------------------------------
  if (!type || typeof limits[type] === "undefined") {
    return {
      allowed: false,
      remaining: 0,
    };
  }

  if (type === "simple") {
    return {
      allowed: true,
      remaining: Infinity,
    };
  }

  const limit = limits[type];

  if (limit === Infinity) {
    return {
      allowed: true,
      remaining: Infinity,
    };
  }

  const used = await getTodayUsage(usuarioId, type);

  return {
    allowed: used < limit,
    remaining: Math.max(limit - used, 0),
  };
}

/**
 * Consume quota ONLY when applicable
 */
export async function consumeBubbleQuota(usuarioId, type) {
  if (!type || type === "simple") return;
  await incrementUsage(usuarioId, type);
}
