// ⚖️ VICIO CLASSIFIER – FASE C4
// Califica el impacto procesal del vicio detectado

export function classifyVices({ audit, agravios, checklist }) {
  const results = [];

  // 1. Motivación aparente
  if (audit?.hasApparentMotivation) {
    results.push({
      tipo: "motivación",
      nivel: "DETERMINANTE",
      efecto: "NULIDAD",
      fundamento:
        "La resolución carece de motivación suficiente, afectando el derecho al debido proceso.",
    });
  }

  // 2. Falacias lógicas graves
  agravios?.forEach((agravio) => {
    const grave =
      /falacia|subsunción|non sequitur|motivación aparente/i.test(
        agravio.titulo
      );

    results.push({
      tipo: "argumentativo",
      nivel: grave ? "DETERMINANTE" : "RELEVANTE",
      efecto: grave ? "NULIDAD" : "AGRAVIO",
      fundamento: agravio.fundamento,
    });
  });

  // 3. Checklist limpio
  if (
    checklist?.length === 1 &&
    checklist[0].startsWith("✓")
  ) {
    results.push({
      tipo: "general",
      nivel: "NO DETERMINANTE",
      efecto: "SIN EFECTO PROCESAL",
      fundamento:
        "No se advierten vicios lógicos determinantes en la resolución.",
    });
  }

  return results;
}
