// backend/brain/index.js
// ============================================================
// 🧠 LitisBrain – Fachada principal del cerebro de LitisBot
// ------------------------------------------------------------
// Punto único de entrada del "cerebro" para evitar prompts duplicados.
//
// Núcleo real:
//  - coreIdentity.js       → CORE_IDENTITY_PROMPT
//  - buildSystemPrompt.js  → ensamblador del System Prompt
//  - modes/*               → modos operativos
//  - sciences/*            → detección/ranking ciencias auxiliares
// ============================================================

import buildSystemPrompt from "./buildSystemPrompt.js";
export { CORE_IDENTITY_PROMPT } from "./coreIdentity.js";

/**
 * COMPAT: antes el backend usaba buildLitisSystemPrompt().
 * Mantenemos el nombre para no romper imports antiguos.
 */
export function buildLitisSystemPrompt(options = {}) {
  return buildSystemPrompt(options);
}

/**
 * Export oficial del ensamblador.
 * Ojo: buildSystemPrompt.js exporta default, por eso lo re-exportamos como named aquí.
 */
export { buildSystemPrompt };

/**
 * Default export para usos antiguos tipo:
 *   import brain from "../brain/index.js"
 */
export default {
  buildSystemPrompt,
  buildLitisSystemPrompt,
};
