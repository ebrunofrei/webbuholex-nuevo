// ============================================================================
// 🧠 D3.1 — REASONING NORMALIZER (R2 ENTERPRISE)
// ----------------------------------------------------------------------------
// Propósito interno:
//   - Ordenar mínimamente el razonamiento sin intervenir el estilo externo.
//   - Detectar el issue jurídico central.
//   - Identificar hechos relevantes (sin inventar).
//   - Determinar norma/criterio aplicable.
//   - Construir razonamiento + conclusión condicional ANTI-DOGMA.
//
// Este módulo:
//   ❌ NO corrige al usuario
//   ❌ NO inventa hechos
//   ❌ NO cita normas inexistentes
//   ❌ NO produce lenguaje final del asistente
//
// Produce un bloque estructural para C2–C5.
// ============================================================================

// ------------------------------------------------------------
// Helpers
// ------------------------------------------------------------
function safeStr(v = "") {
  return String(v || "").trim();
}

// ------------------------------------------------------------
// 1) ISSUE DETECTOR (heurística mínima, sin invención)
// ------------------------------------------------------------
function detectIssue(input = "") {
  const text = safeStr(input);
  if (!text) return "análisis jurídico general";

  if (/nulidad|nulo/i.test(text)) return "validez procesal / nulidad";
  if (/prueba|perito|expediente/i.test(text)) return "valoración probatoria";
  if (/interpretar|norma/i.test(text)) return "interpretación normativa";
  if (/apelaci[oó]n|recurso/i.test(text)) return "estrategia impugnatoria";

  return "análisis jurídico general";
}

// ------------------------------------------------------------
// 2) FACTS EXTRACTOR — ultra conservador (R2)
// ------------------------------------------------------------
function extractRelevantFacts(input = "", context = {}) {
  // R2: No inventa NADA. Si backend provee hechos, se usan.
  if (context?.hechosRelevantes) return context.hechosRelevantes;

  return []; // Si no existen hechos fiables, no se infiere nada.
}

// ------------------------------------------------------------
// 3) RULE RESOLVER — evita invención normativa
// ------------------------------------------------------------
function resolveRule(context = {}) {
  if (context?.normaAplicable) return context.normaAplicable;

  return "criterios generales del ordenamiento y del debido proceso";
}

// ------------------------------------------------------------
// 4) REASONING BUILDER — secuencia mínima, sin conclusiones duras
// ------------------------------------------------------------
function buildReasoning({ issue, facts, rule }) {
  const steps = [];

  steps.push(
    `El análisis se orienta a ${issue}, considerando los hechos disponibles y ${rule}.`
  );

  if (!facts || facts.length === 0) {
    steps.push(
      "A la fecha, no se identifican hechos suficientes que permitan sostener afirmaciones categóricas."
    );
  } else {
    steps.push(
      "Los hechos relevantes deben valorarse en conjunto, evitando selecciones parciales o sesgos confirmatorios."
    );
  }

  return steps.join(" ");
}

// ------------------------------------------------------------
// 5) CONDITIONAL CONCLUSION — anti dogmatismo total
// ------------------------------------------------------------
function buildConditionalConclusion({ issue }) {
  return (
    `Una conclusión definitiva respecto a ${issue} ` +
    "requiere la acreditación concreta de los presupuestos fácticos y jurídicos pertinentes."
  );
}

// ------------------------------------------------------------
// 6) MAIN API — Normalize Reasoning (D3.1)
// ------------------------------------------------------------
export function normalizeReasoning(input = "", context = {}) {
  const issue = detectIssue(input);
  const facts = extractRelevantFacts(input, context);
  const rule = resolveRule(context);

  const reasoning = buildReasoning({ issue, facts, rule });
  const conclusion = buildConditionalConclusion({ issue });

  return {
    issue,
    facts,
    rule,
    reasoning,
    conclusion,
  };
}

export default normalizeReasoning;
