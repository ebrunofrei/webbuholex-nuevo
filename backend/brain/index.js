// ============================================================
// 🧠 LitisBrain — Fachada Cognitiva Principal (R7.6++)
// ------------------------------------------------------------
// Punto único de entrada del cerebro de LITIS.
// - Mantiene compatibilidad histórica
// - Expone el Kernel
// - Expone los subsistemas cognitivos R7.6
// ============================================================

// ------------------------------------------------------------
// 🔐 KERNEL (núcleo soberano)
// ------------------------------------------------------------
import buildSystemPrompt from "./buildSystemPrompt.js";
export { CORE_IDENTITY_PROMPT } from "./coreIdentity.js";

// ------------------------------------------------------------
// 🧠 SUBSISTEMAS R7.6
// ------------------------------------------------------------
export * as TurnContext from "./context/TurnContext/index.js";
export * as Engine from "./context/Engine/index.js";
export * as System from "./context/system/index.js";

// ------------------------------------------------------------
// 🧠 COMPATIBILIDAD HISTÓRICA
// ------------------------------------------------------------

/**
 * COMPAT: antes el backend usaba buildLitisSystemPrompt().
 * Se mantiene para no romper imports antiguos.
 */
export function buildLitisSystemPrompt(options = {}) {
  return buildSystemPrompt(options);
}

/**
 * Export oficial del ensamblador del System Prompt.
 * (Kernel soberano)
 */
export { buildSystemPrompt };

// ------------------------------------------------------------
// 🧱 DEFAULT EXPORT (LEGACY SAFE)
// ------------------------------------------------------------
export default {
  // Kernel
  buildSystemPrompt,
  buildLitisSystemPrompt,

  // Subsistemas modernos (no rompe legacy)
  TurnContext,
  Engine,
  System,
};
