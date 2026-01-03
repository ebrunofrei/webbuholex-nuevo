// backend/brain/analysis/reasoningNormalizer.js
// ============================================================
// D3.1 — Normalización del razonamiento jurídico (INTERNO)
// Impone orden lógico mínimo sin exponer estructura al usuario.
// ============================================================

function safeStr(v = "") {
  return String(v || "").trim();
}

// --- Detecta el problema jurídico central (no conclusiones)
function detectIssue(input = "") {
  const text = safeStr(input);
  if (!text) return null;

  // Heurística mínima (se refina en D3.x)
  if (/nulidad|nulo/i.test(text)) return "validez procesal / nulidad";
  if (/prueba|perito|expediente/i.test(text)) return "valoración probatoria";
  if (/interpretar|norma/i.test(text)) return "interpretación normativa";
  if (/apelaci[oó]n|recurso/i.test(text)) return "estrategia impugnatoria";

  return "análisis jurídico general";
}

// --- Extrae hechos relevantes (solo los necesarios)
function extractRelevantFacts(input = "", context = {}) {
  // D3.1: conservador por diseño (mejor pocos que inventar)
  const facts = [];

  if (context && context.hechosRelevantes) {
    return context.hechosRelevantes;
  }

  // Heurística mínima: no inventar
  return facts;
}

// --- Resuelve norma / criterio aplicable (sin citar en falso)
function resolveRule(context = {}) {
  if (context && context.normaAplicable) {
    return context.normaAplicable;
  }
  return "criterios generales del ordenamiento y del debido proceso";
}

// --- Construye cadena de razonamiento (sin saltos)
function buildReasoning({ issue, facts, rule }) {
  const steps = [];

  steps.push(
    `El análisis se centra en ${issue}, considerando los hechos disponibles y ${rule}.`
  );

  if (!facts || facts.length === 0) {
    steps.push(
      "Con la información disponible, no se advierten hechos suficientes para afirmar conclusiones categóricas."
    );
  } else {
    steps.push(
      "Los hechos relevantes deben ser evaluados de forma conjunta, evitando selecciones parciales."
    );
  }

  return steps.join(" ");
}

// --- Conclusión condicionada (ANTI-DOGMA)
function buildConditionalConclusion({ issue }) {
  return (
    `Cualquier conclusión sobre ${issue} ` +
    "solo sería sostenible si se acreditan de manera concreta los presupuestos fácticos y jurídicos pertinentes."
  );
}

// ============================================================
// API PRINCIPAL
// ============================================================
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
