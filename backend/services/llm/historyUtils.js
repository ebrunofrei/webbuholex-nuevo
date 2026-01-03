// ======================================================================
// 🧠 HISTORY UTILS – TOKEN SAFE
// ----------------------------------------------------------------------
// Utilidades para recorte de historial y protección de tokens
// ======================================================================

export function trimMessages(messages, maxChars = 18_000) {
  if (!Array.isArray(messages) || messages.length <= 2) return messages;

  let total = messages.reduce(
    (acc, m) => acc + (m.content?.length || 0),
    0
  );

  if (total <= maxChars) return messages;

  const out = [messages[0]]; // system SIEMPRE

  for (let i = messages.length - 1; i >= 1; i--) {
    const msg = messages[i];
    const len = msg.content?.length || 0;

    if (total - len < maxChars) {
      out.splice(1, 0, msg);
      total -= len;
    } else {
      total -= len;
    }

    if (total <= maxChars) break;
  }

  return out;
}
