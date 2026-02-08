// ======================================================================
// 🧠 SYSTEM CONSTANTS — LITIS (R7.6++)
// ----------------------------------------------------------------------
// Shared constants for the System subsystem.
// - Stable
// - Declarative
// - No logic
// - Internal language: English
// ======================================================================

/**
 * Kernel operational modes.
 * NOTE: Values are legacy-stable tokens used across the runtime.
 * Do NOT change values without a coordinated migration.
 */
export const SYSTEM_MODES = {
  // Legacy-stable tokens (do not change)
  LITIGANTE: "litigante",
  DOCTRINAL: "doctrinal",
  ANALITICO: "analitico",
};

/**
 * Optional English aliases (internal readability / future migration).
 * These are NOT meant to be sent to the Kernel unless you migrate it.
 */
export const SYSTEM_MODE_ALIASES = {
  LITIGATOR: SYSTEM_MODES.LITIGANTE,
  DOCTRINAL: SYSTEM_MODES.DOCTRINAL,
  ANALYTICAL: SYSTEM_MODES.ANALITICO,
};

/**
 * Turn actions emitted by TurnContextResolver.
 * Used as signals, not commands.
 */
export const TURN_ACTIONS = {
  NEW_TOPIC: "NEW_TOPIC",
  MERGE_CONTEXT: "MERGE_CONTEXT",
  HARD_RESET: "HARD_RESET",
};

/**
 * Semantic thresholds used at the System level.
 * (They do not replace Resolver thresholds.)
 */
export const SEMANTIC_THRESHOLDS = {
  CONTINUITY_HIGH: 0.35,
  CONTINUITY_LOW: 0.15,
};

/**
 * Structural limits for context passed to the Kernel.
 */
export const SYSTEM_LIMITS = {
  MAX_BACKEND_BLOCK_LENGTH: 4000,
};

/**
 * Reserved internal flags (never exposed to the user).
 */
export const INTERNAL_FLAGS = {
  RESET_EPISTEMIC: "analysisReset",
};

/**
 * Temporal synchronization constants.
 * IMPORTANT: Inject these into the system prompt to avoid timeline drift.
 * You can override via env at runtime.
 */
export const TIME_CONTEXT = {
  CURRENT_DATE: process.env.CURRENT_DATE || null, // e.g. "2026-01-15"
  TIMEZONE: process.env.TIMEZONE || "America/Lima",
  LOCALE: process.env.LOCALE || "es-PE",
};

export default {
  SYSTEM_MODES,
  SYSTEM_MODE_ALIASES,
  TURN_ACTIONS,
  SEMANTIC_THRESHOLDS,
  SYSTEM_LIMITS,
  INTERNAL_FLAGS,
  TIME_CONTEXT,
};
