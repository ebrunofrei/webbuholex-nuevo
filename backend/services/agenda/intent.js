// backend/services/agenda/intent.js
// ============================================================
// Clasificación de intención de agenda (STATE-AWARE)
// NO decide CREATE vs QUERY si viene forzado
// ============================================================

function norm(text = "") {
  return String(text || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function hasAny(re, t) {
  return re.test(t);
}

const YES_RE = /\b(s[ií]|si|ok|dale|listo|confirmo|ponle|activa)\b/;
const NO_RE  = /\b(no|nop|mejor no|cancelar|no gracias|desactiva)\b/;

export function classifyAgendaIntent(text = "", context = {}) {
  const t = norm(text);

  // 🧠 AUTORIDAD SUPERIOR
  if (context?.forcedIntent === "create") {
    return "create";
  }

  const pendingAction = context?.pendingAction || null;

  // 0) FOLLOW-UP
  if (pendingAction === "ask_reminder") {
    if (YES_RE.test(t)) return "reminder_on";
    if (NO_RE.test(t))  return "reminder_off";
    return "reminder_clarify";
  }

  // 1) CANCEL
  if (hasAny(/\b(cancel|cancela|anula|elimina|borra|quita)\b/, t)) {
    return "cancel";
  }

  // 2) CONFIRM
  if (
    hasAny(/\b(ya\s+est[aá]\s+registrad|confirmaci[oó]n|ya\s+qued[oó])\b/, t)
  ) {
    return "confirm";
  }

  // 3) QUERY por defecto
  return "query";
}
