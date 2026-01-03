// ============================================================
// 🧼 NORMALIZERS – BÚHOLEX (CANÓNICO / ENTERPRISE)
// ============================================================
// Fuente única de normalización defensiva.
// ❌ NO genera IDs inventados
// ✅ Respeta sessionId / expedienteId canónico: case_<caseId>
// ============================================================

/* ------------------------------------------------------------
 * Texto base
 * ---------------------------------------------------------- */
export function normalizeText(str = "") {
  return String(str)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function safeStr(v = "", maxLen = 8000) {
  if (v == null) return "";
  const s = String(v).replace(/\r\n/g, "\n").trim();
  return s.length > maxLen ? s.slice(0, maxLen) : s;
}

export function safeId(v, fallback = null, maxLen = 128) {
  if (v == null) return fallback;
  const s = String(v).trim();
  if (!s) return fallback;
  return s.length > maxLen ? s.slice(0, maxLen) : s;
}

/* ------------------------------------------------------------
 * Adjuntos / historial (blindaje soft)
 * ---------------------------------------------------------- */
export function normalizeAdjuntos(adjuntos = [], max = 12) {
  if (!Array.isArray(adjuntos)) return [];
  return adjuntos.slice(0, max);
}

export function normalizeHistorialCliente(historial = [], max = 20) {
  if (!Array.isArray(historial)) return [];
  return historial.slice(-max);
}

/* ------------------------------------------------------------
 * 🛡️ EXPEDIENTE / SESSION ID (CANÓNICO)
 * ---------------------------------------------------------- */
/**
 * Regla:
 * - Si hay caseId => sessionId = case_<caseId>
 * - Si NO hay caseId => "default"
 * - ❌ Nunca generar chat_<usuario>
 */
export function resolveExpedienteId({
  caseId,
  sessionId,
}) {
  const cid = safeId(caseId);
  if (cid) return `case_${cid}`;

  const sid = safeId(sessionId);
  if (sid && sid.startsWith("case_")) return sid;

  return "default";
}
