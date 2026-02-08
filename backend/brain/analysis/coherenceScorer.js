// ============================================================================
// 🧠 COHERENCE SCORER – LITISBOT (FASE B1 — R2 ENTERPRISE)
// ----------------------------------------------------------------------------
// Evalúa coherencia lógica estructural del discurso:
//   • Tensiones entre conectores incompatibles
//   • Conclusiones sin premisas (salto lógico clásico)
//   • Conclusión anticipada respecto al desarrollo
//
// No corrige.
// No modula tono.
// No genera texto visible.
// Produce score interno para C1 → C5.
// ============================================================================

/* ------------------------------------------------------------
   Utils
------------------------------------------------------------ */
function normalizeText(t = "") {
  return String(t)
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function splitParagraphs(text = "") {
  return text
    .split(/\n+/)
    .map((p) => p.trim())
    .filter(Boolean);
}

/* ------------------------------------------------------------
   CONTRADICTORY CONNECTORS – SET R2 ENTERPRISE
------------------------------------------------------------ */
const CONTRADICTORY_PAIRS = [
  { a: "sin embargo",  b: "por tanto",        weight: 1.0 },
  { a: "no obstante",  b: "en consecuencia",  weight: 1.0 },
  { a: "pero",         b: "por ende",         weight: 0.6 }, // severidad moderada
];

/* ------------------------------------------------------------
   COHERENCE SCORER (B1)
------------------------------------------------------------ */
export function scoreCoherence({
  prompt = "",
  draft = "",
  cognitiveProfile = {},
}) {
  const text = normalizeText(`${prompt}\n${draft}`);

  // Caso vacío
  if (!text) {
    return {
      score: 1,
      issues: [],
      rawText: "",
      hasIssues: false,
      summary: "Sin contenido evaluable.",
    };
  }

  const issues = [];
  let penalty = 0;

  // ------------------------------------------------------------
  // 1️⃣ Tensiones entre conectores incompatibles
  // ------------------------------------------------------------
  for (const pair of CONTRADICTORY_PAIRS) {
    if (text.includes(pair.a) && text.includes(pair.b)) {
      issues.push(
        `Tensión argumentativa entre los conectores "${pair.a}" y "${pair.b}".`
      );
      penalty += 0.10 * pair.weight;
    }
  }

  // ------------------------------------------------------------
  // 2️⃣ Conclusión sin premisas (salto lógico)
  // ------------------------------------------------------------
  const hasConclusion =
    /\b(por tanto|por lo tanto|en consecuencia|por ende|se concluye)\b/.test(
      text
    );

  const hasPremises =
    /\b(dado que|puesto que|considerando|en razón de|porque)\b/.test(text);

  if (hasConclusion && !hasPremises) {
    issues.push("Conclusión detectada sin premisas explícitas.");
    penalty += 0.12;
  }

  // ------------------------------------------------------------
  // 3️⃣ Conclusión anticipada vs. desarrollo
  // ------------------------------------------------------------
  const paragraphs = splitParagraphs(text);

  if (paragraphs.length >= 3) {
    const first = paragraphs[0];
    const last = paragraphs[paragraphs.length - 1];

    const conclRegex =
      /\b(por tanto|por lo tanto|se concluye|en consecuencia)\b/;

    if (conclRegex.test(first) && !conclRegex.test(last)) {
      issues.push("La conclusión aparece antes del desarrollo argumentativo.");
      penalty += 0.10;
    }
  }

  // ------------------------------------------------------------
  // 🎯 SCORE FINAL (ajustado por perfil cognitivo)
  // ------------------------------------------------------------
  let score = 1 - penalty;

  if (cognitiveProfile?.rigor && issues.length) {
    score -= issues.length * 0.02; // micro penalización adicional
  }

  score = Math.max(0, Math.min(1, Number(score.toFixed(2))));

  // ------------------------------------------------------------
  // RETORNO CANÓNICO
  // ------------------------------------------------------------
  return {
    score,
    issues,
    rawText: text,
    hasIssues: issues.length > 0,
    summary:
      issues.length === 0
        ? "Coherencia estable sin tensiones relevantes."
        : "Se detectan inconsistencias argumentativas.",
  };
}

export default scoreCoherence;
