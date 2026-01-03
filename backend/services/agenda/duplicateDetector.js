// ============================================================
// 🧠 Duplicate Detector (SEMÁNTICO + HUMANO)
// ------------------------------------------------------------
// Responsabilidad única:
// → decidir si dos eventos representan el MISMO hecho jurídico
// ============================================================

/* =========================
   Configuración
========================= */
const TIME_WINDOW_MINUTES = 30;
const MIN_TEXT_SIMILARITY = 0.6;

const STOP_WORDS_REGEX =
  /audiencia|cita|reuni[oó]n|plazo|vencimiento|evento|judicial/g;

/* =========================
   Normalización de texto
========================= */
function normalizeText(input = "") {
  return String(input)
    .toLowerCase()
    .replace(STOP_WORDS_REGEX, "")
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/* =========================
   Similaridad léxica simple
   (Jaccard-like, sin embeddings)
========================= */
function textSimilarity(a = "", b = "") {
  const A = new Set(normalizeText(a).split(" ").filter(Boolean));
  const B = new Set(normalizeText(b).split(" ").filter(Boolean));

  if (A.size === 0 || B.size === 0) return 0;

  let intersection = 0;
  for (const w of A) if (B.has(w)) intersection++;

  return intersection / Math.max(A.size, B.size);
}

/* =========================
   Utilidades temporales
========================= */
function sameDayISO(aISO, bISO) {
  return (
    typeof aISO === "string" &&
    typeof bISO === "string" &&
    aISO.slice(0, 10) === bISO.slice(0, 10)
  );
}

function diffMinutes(aISO, bISO) {
  if (!aISO || !bISO) return Infinity;
  return Math.abs(
    new Date(aISO).getTime() - new Date(bISO).getTime()
  ) / 60000;
}

/* =========================
   API PRINCIPAL
========================= */

/**
 * Determina si dos eventos son semánticamente duplicados
 *
 * Criterios:
 * 1) Misma fecha
 * 2) Hora cercana (± TIME_WINDOW_MINUTES)
 * 3) Título con similitud >= MIN_TEXT_SIMILARITY
 */
export function isSemanticDuplicate(draft, existingEvent) {
  if (!draft || !existingEvent) return false;

  // 1️⃣ misma fecha
  if (!sameDayISO(draft.startISO, existingEvent.startISO)) {
    return false;
  }

  // 2️⃣ hora cercana
  if (diffMinutes(draft.startISO, existingEvent.startISO) > TIME_WINDOW_MINUTES) {
    return false;
  }

  // 3️⃣ similitud semántica del título
  const similarityScore = textSimilarity(
    draft.title,
    existingEvent.title
  );

  return similarityScore >= MIN_TEXT_SIMILARITY;
}

/* =========================
   (Opcional) export interno
   para tests unitarios
========================= */
export const __test__ = {
  normalizeText,
  textSimilarity,
  diffMinutes,
};
