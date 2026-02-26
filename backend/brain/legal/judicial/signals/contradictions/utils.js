// brain/legal/judicial/signals/contradictions/utils.js

export function normalizeText(s) {
  return (s || "")
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function simpleHash(str) {
  // hash simple determinista (v1)
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return `c${h.toString(16)}`;
}

export function sameDay(a, b) { return a === b; }

export function diffDays(a, b) {
  // a,b: "YYYY-MM-DD"
  const da = new Date(a + "T00:00:00Z");
  const db = new Date(b + "T00:00:00Z");
  return Math.round((db - da) / (1000 * 60 * 60 * 24));
}

export function amountClose(a, b) {
  if (!a || !b) return true;
  if (a.currency !== b.currency) return false;
  const diff = Math.abs(a.value - b.value);
  const base = Math.max(1, Math.abs(a.value));
  return diff / base < 0.02; // 2% tolerancia (v1)
}

export function clamp01(x) { return Math.max(0, Math.min(1, x)); }