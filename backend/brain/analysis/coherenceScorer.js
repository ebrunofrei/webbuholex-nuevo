// ======================================================================
// 🧠 COHERENCE SCORER – LITISBOT (FASE B1)
// ----------------------------------------------------------------------
// Evalúa coherencia lógica y consistencia argumentativa.
// - NO corrige
// - NO responde
// - NO explica
// Devuelve métricas internas para el kernel.
// ======================================================================

function normalizeText(t = "") {
  return String(t)
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Heurística simple pero robusta:
 * - contradicciones explícitas
 * - conectores lógicos
 * - estructura premisa → conclusión
 */
export function scoreCoherence({
  prompt = "",
  draft = "",
  cognitiveProfile = {},
}) {
  const text = normalizeText(`${prompt}\n${draft}`);
  if (!text) {
    return {
      score: 1,
      issues: [],
    };
  }

  const issues = [];

  // 1️⃣ Contradicciones explícitas
  const contradictions = [
    ["sin embargo", "por tanto"],
    ["no obstante", "en consecuencia"],
    ["pero", "por ende"],
  ];

  contradictions.forEach(([a, b]) => {
    if (text.includes(a) && text.includes(b)) {
      issues.push(
        `Posible tensión argumentativa entre conectores "${a}" y "${b}".`
      );
    }
  });

  // 2️⃣ Saltos lógicos (conclusión sin premisas)
  const hasConclusion =
    /(por tanto|en consecuencia|por ende|se concluye)/i.test(text);

  const hasPremises =
    /(dado que|puesto que|considerando|en razón de)/i.test(text);

  if (hasConclusion && !hasPremises) {
    issues.push(
      "Conclusión detectada sin premisas explícitas."
    );
  }

  // 3️⃣ Orden argumentativo
  const paragraphs = text.split(/\n+/);
  if (paragraphs.length >= 3) {
    const first = paragraphs[0];
    const last = paragraphs[paragraphs.length - 1];

    if (
      /(por tanto|se concluye|en consecuencia)/i.test(first) &&
      !/(por tanto|se concluye|en consecuencia)/i.test(last)
    ) {
      issues.push(
        "La conclusión aparece antes del desarrollo argumentativo."
      );
    }
  }

  // 🎯 Score (simple, interpretable)
  let score = 1;
  score -= issues.length * 0.15;

  // Ajuste por perfil cognitivo
  if (cognitiveProfile?.rigor) {
    score -= issues.length * 0.05;
  }

  score = Math.max(0, Math.min(1, Number(score.toFixed(2))));

  return {
    score,
    issues,
  };
}
