// brain/legal/judicial/signals/contradictions/NumericResolver.js
export function parseAmountsFromText(text) {
  const out = [];
  const t = text.replace(/\s+/g, " ");

  // S/ 20,000.50  |  S/ 20000  |  $ 1,200
  const re = /\b(S\/\.?|S\/|\$|USD)\s*([0-9]{1,3}(?:[.,][0-9]{3})*(?:[.,][0-9]{2})?|[0-9]+(?:[.,][0-9]{2})?)\b/g;
  let m;
  while ((m = re.exec(t)) !== null) {
    const currency = normalizeCurrency(m[1]);
    const value = normalizeNumber(m[2]);
    if (!Number.isNaN(value)) out.push({ value, currency });
  }
  return out;
}

function normalizeCurrency(c) {
  const x = c.toUpperCase();
  if (x.includes("S/")) return "PEN";
  if (x.includes("USD") || x.includes("$")) return "USD";
  return "UNK";
}

function normalizeNumber(s) {
  // estrategia: si hay ambos . y , asumimos miles/decimales por posición
  const hasDot = s.includes(".");
  const hasComma = s.includes(",");
  let cleaned = s;

  if (hasDot && hasComma) {
    // 20,000.50 -> remove commas
    if (s.lastIndexOf(".") > s.lastIndexOf(",")) cleaned = s.replace(/,/g, "");
    // 20.000,50 -> remove dots, comma decimal
    else cleaned = s.replace(/\./g, "").replace(",", ".");
  } else if (hasComma && !hasDot) {
    // puede ser 20,000 (miles) o 20,50 (decimal). asumimos miles si 3 dígitos después
    const parts = s.split(",");
    cleaned = parts[1] && parts[1].length === 3 ? s.replace(/,/g, "") : s.replace(",", ".");
  } else {
    // dot solo: usualmente decimal o miles; si 3 dígitos después, miles
    const parts = s.split(".");
    cleaned = parts[1] && parts[1].length === 3 ? s.replace(/\./g, "") : s;
  }
  return Number(cleaned);
}