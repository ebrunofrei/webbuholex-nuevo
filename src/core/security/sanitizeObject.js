// src/core/security/sanitizeObject.js
// ============================================================================
// Security — Prototype Pollution Guard (JS/JSX SAFE)
// ----------------------------------------------------------------------------
// - NO deps
// - NO Object.prototype reliance
// - Object.create(null) to kill prototype chain
// - Optional: string cap + HTML escaping (safe-by-default)
// ============================================================================

const FORBIDDEN_KEYS = ["__proto__", "prototype", "constructor"];

const DEFAULTS = {
  maxString: 12000,
  escapeStrings: true,
};

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function sanitizeObject(input, opts = {}) {
  const { maxString, escapeStrings } = { ...DEFAULTS, ...opts };

  // Primitives pass-through
  if (input === null || typeof input !== "object") {
    if (typeof input === "string") {
      const sliced = input.length > maxString ? input.slice(0, maxString) : input;
      return escapeStrings ? escapeHtml(sliced) : sliced;
    }
    return input;
  }

  // Arrays: sanitize each element
  if (Array.isArray(input)) {
    return input.map((v) => sanitizeObject(v, opts));
  }

  // Dates -> ISO (stable)
  if (input instanceof Date) {
    return input.toISOString();
  }

  // Plain objects: create without prototype
  const safe = Object.create(null);

  for (const key of Object.keys(input)) {
    if (FORBIDDEN_KEYS.includes(key)) continue;
    safe[key] = sanitizeObject(input[key], opts);
  }

  return safe;
}

