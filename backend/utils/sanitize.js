export function safeStr(v, maxLen = 8000) {
  if (v == null) return "";
  const s = String(v)
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return s.length > maxLen ? s.slice(0, maxLen) : s;
}

export function safeId(v, fallback = null, maxLen = 128) {
  const s = typeof v === "string" ? v.trim() : "";
  return s ? s.slice(0, maxLen) : fallback;
}
