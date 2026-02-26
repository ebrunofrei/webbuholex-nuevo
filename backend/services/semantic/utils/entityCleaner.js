// ============================================================
// 🔧 Entity Normalizer — Juris Precision v2
// ------------------------------------------------------------
// - Expedientes robustos (multi-formato)
// - Fechas ISO normalizadas
// - Montos seguros (sin destruir texto)
// - Modular y escalable
// ============================================================

import { CLEAN } from "./normalize.js";

// ------------------------------------------------------------
// 1️⃣ Normalizar Expedientes
// ------------------------------------------------------------

export function normalizeCaseNumbers(text = "") {
  return text.replace(
    /\b(\d{1,6})\s*[\/\-–—]\s*(\d{4})\b/g,
    "$1-$2"
  );
}

// ------------------------------------------------------------
// 2️⃣ Normalizar Fechas (DD/MM/YYYY → YYYY-MM-DD)
// ------------------------------------------------------------

export function normalizeDates(text = "") {
  return text.replace(
    /\b(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})\b/g,
    (_, d, m, y) => {
      const day = d.padStart(2, "0");
      const month = m.padStart(2, "0");
      return `${y}-${month}-${day}`;
    }
  );
}

// ------------------------------------------------------------
// 3️⃣ Normalizar Montos (seguro)
// ------------------------------------------------------------

export function normalizeMoney(text = "") {
  return text.replace(
    /\b(?:s\/|soles|\$|usd)\s*([\d,.]+)\b/gi,
    (_, amount) => {
      const normalized = amount
        .replace(/\.(?=\d{3}(?:\D|$))/g, "") // elimina separadores miles tipo 1.200
        .replace(/,(?=\d{3}(?:\D|$))/g, "")  // elimina miles tipo 1,200
        .replace(",", ".");                 // convierte decimal europeo

      return normalized;
    }
  );
}

// ------------------------------------------------------------
// 4️⃣ Normalizador Global
// ------------------------------------------------------------

export function NORMALIZE_ENTITIES(text = "") {
  let result = text;

  result = normalizeCaseNumbers(result);
  result = normalizeDates(result);
  result = normalizeMoney(result);

  return result;
}