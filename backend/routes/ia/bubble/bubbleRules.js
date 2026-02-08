const ADVICE_RX =
  /(recomiendo|conviene|deber[ií]a|estrategia|probabilidad|ganar|perder|presentar|interponer|demanda|apelaci[oó]n|casaci[oó]n)/i;

export function violatesBubbleRules(text = "") {
  if (!text || typeof text !== "string") return false;
  return ADVICE_RX.test(text);
}

// backend/routes/ia/bubble/bubbleRules.js

export function applyBubbleHardStop(reply) {
  // No truncation.
  // This function is kept for future safety rules,
  // but currently it does not cut legal reasoning.
  return reply;
}
