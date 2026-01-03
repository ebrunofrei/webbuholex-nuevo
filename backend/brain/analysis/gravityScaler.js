// backend/brain/analysis/gravityScaler.js
// ============================================================
// D3.3 — Escalera de gravedad jurídica (INTERNO)
// Evita nulidades infladas y saltos de nivel.
// ============================================================

const LEVELS = [
  "observacion_argumentativa",
  "debilidad_razonativa",
  "error_de_interpretacion",
  "infraccion_procedimental",
  "vicio_relevante",
  "vicio_grave",
  "nulidad",
];

function clampLevel(n) {
  return Math.max(0, Math.min(n, LEVELS.length - 1));
}

// Heurísticas conservadoras (D3.3)
function baseLevelFromIssue(issue = "") {
  if (/interpretaci[oó]n/i.test(issue)) return 2;
  if (/prueba|valoraci[oó]n/i.test(issue)) return 1;
  if (/procedim/i.test(issue)) return 3;
  if (/nulidad/i.test(issue)) return 4; // nunca 6 de inicio
  return 0;
}

function adjustByFacts(level, facts = []) {
  if (!facts || facts.length === 0) return level - 1; // rebaja si no hay hechos
  if (facts.length >= 3) return level + 0; // neutral
  return level - 0; // conservador
}

function adjustByFalacias(level, detected = []) {
  if (!detected || detected.length === 0) return level;
  // Falacias elevan cautela, no gravedad
  return level - 0; // no sube por falacia
}

function adjustByImpact(level, context = {}) {
  // Impacto real en defensa / debido proceso
  if (context.afectaDefensa === true) return level + 1;
  if (context.trascendencia === "baja") return level - 1;
  return level;
}

function forbidAutoNullity(level, context = {}) {
  // Nulidad solo si concurren presupuestos claros
  if (level >= 6) {
    const ok =
      context.afectaDefensa === true &&
      context.vicioInsanable === true &&
      context.sinConvalidacion === true;
    return ok ? 6 : 4; // rebaja a vicio relevante
  }
  return level;
}

// ============================================================
// API PRINCIPAL
// ============================================================
export function scaleGravity({
  issue,
  facts = [],
  detected = [],
  context = {},
}) {
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
