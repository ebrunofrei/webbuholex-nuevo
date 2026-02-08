// ============================================================================
// 🧠 detectReset
// ----------------------------------------------------------------------------
// Detects explicit user intent to reset cognitive context.
// - NO reasoning
// - NO LLM calls
// - Conservative by design
//
// Purpose:
// - Invalidate prior reasoning ONLY when explicitly requested
// ============================================================================

const RESET_PATTERNS = [
  /\b(reset|restart|start over)\b/i,
  /\b(new topic|change topic)\b/i,
  /\b(forget previous|ignore previous)\b/i,
  /\b(clear context|clear memory)\b/i,
  /\b(olvid[aá]|reinici[aá]|empezar de nuevo)\b/i,
  /\b(cambia(r)? de tema|nuevo tema)\b/i,
];

export function detectReset(text = "") {
  if (!text || typeof text !== "string") return "";

  for (const pattern of RESET_PATTERNS) {
    if (pattern.test(text)) {
      return "User explicitly requested a cognitive context reset.";
    }
  }

  return "";
}

export default detectReset;
