// ============================================================================
// 🦉 money utils — redondeo estable
// ============================================================================
export function toNumber(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export function round2(n) {
  return Math.round((toNumber(n) + Number.EPSILON) * 100) / 100;
}
