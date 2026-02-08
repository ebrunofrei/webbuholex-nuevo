// ============================================================================
// ⚖️ D3.3 — GRAVITY SCALER (R2 ENTERPRISE)
// ----------------------------------------------------------------------------
// Función interna de control de gravedad jurídica.
// Objetivo:
//   • Evitar inflar vicios sin sustento.
//   • Estabilizar niveles de gravedad procesal.
//   • Garantizar coherencia con C3–C5 sin crear contradicciones.
//
// Esta capa NO:
//   ❌ genera texto
//   ❌ argumenta
//   ❌ decide nulidades
//
// Solo devuelve un nivel estructural (0–6) para uso interno.
// ============================================================================

const LEVELS = [
  "observacion_argumentativa", // 0
  "debilidad_razonativa",      // 1
  "error_de_interpretacion",   // 2
  "infraccion_procedimental",  // 3
  "vicio_relevante",           // 4
  "vicio_grave",               // 5
  "nulidad",                   // 6
];

/* ------------------------------------------------------------
   Bounds matemáticos
------------------------------------------------------------ */
function clampLevel(n) {
  return Math.max(0, Math.min(n, LEVELS.length - 1));
}

/* ------------------------------------------------------------
   1️⃣ Nivel base según el issue jurídico identificado
------------------------------------------------------------ */
function baseLevelFromIssue(issue = "") {
  if (!issue) return 0;

  if (/interpretaci[oó]n/i.test(issue)) return 2;
  if (/prueba|valoraci[oó]n/i.test(issue)) return 1;
  if (/procedim/i.test(issue)) return 3;
  if (/nulidad/i.test(issue)) return 4; // nunca inicia como 6 (nulidad directa)

  return 0;
}

/* ------------------------------------------------------------
   2️⃣ Ajuste por hechos disponibles
   - Si no hay hechos → rebaja
   - Si hay suficientes hechos → estable
------------------------------------------------------------ */
function adjustByFacts(level, facts = []) {
  if (!facts || facts.length === 0) return level - 1; // rebaja automática
  if (facts.length >= 3) return level;               // estabilidad
  return level; // no sube por pocos hechos (conservador)
}

/* ------------------------------------------------------------
   3️⃣ Falacias NO aumentan gravedad (principio R2)
------------------------------------------------------------ */
function adjustByFalacias(level, detected = []) {
  return level; // la gravedad procesal no se infla por errores lógicos
}

/* ------------------------------------------------------------
   4️⃣ Impacto procesal real
   - Única forma legítima de aumentar nivel
------------------------------------------------------------ */
function adjustByImpact(level, context = {}) {
  if (context.afectaDefensa === true) return level + 1;

  if (context.trascendencia === "baja") return level - 1;

  return level;
}

/* ------------------------------------------------------------
   5️⃣ Anti-nulidad automática (regla de oro)
------------------------------------------------------------ */
function forbidAutoNullity(level, context = {}) {
  if (level < 6) return level;

  // Requisitos estrictos
  const ok =
    context.afectaDefensa === true &&
    context.vicioInsanable === true &&
    context.sinConvalidacion === true;

  // Si no se cumplen → rebajar automáticamente a 4 (vicio relevante)
  return ok ? 6 : 4;
}

/* ============================================================================
   API PRINCIPAL
============================================================================ */
export function scaleGravity({ issue, facts = [], detected = [], context = {} }) {
  let level = baseLevelFromIssue(issue);
  level = adjustByFacts(level, facts);
  level = adjustByFalacias(level, detected);
  level = adjustByImpact(level, context);
  level = clampLevel(level);
  level = forbidAutoNullity(level, context);

  return {
    level,
    label: LEVELS[level],
  };
}

export default scaleGravity;
