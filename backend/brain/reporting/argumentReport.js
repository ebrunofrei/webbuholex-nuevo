// ======================================================================
// 🧠 ARGUMENT REPORT – LITISBOT (FASE C2)
// ----------------------------------------------------------------------
// Construye un informe pericial a partir del análisis lógico.
// ======================================================================

export function buildArgumentReport(analysis) {
  if (!analysis) return "";

  const {
    score,
    riskLevel,
    coherence,
    fallacies,
  } = analysis;

  const lines = [];

  lines.push("INFORME DE CONTROL LÓGICO-ARGUMENTATIVO");
  lines.push("");
  lines.push(`Nivel global de coherencia: ${score}`);
  lines.push(`Nivel de riesgo lógico: ${riskLevel.toUpperCase()}`);
  lines.push("");

  if (coherence?.issues?.length) {
    lines.push("OBSERVACIONES DE COHERENCIA:");
    coherence.issues.forEach((i, idx) => {
      lines.push(`${idx + 1}. ${i}`);
    });
    lines.push("");
  }

  if (fallacies?.detected?.length) {
    lines.push("FALACIAS DETECTADAS:");
    fallacies.detected.forEach((f, idx) => {
      lines.push(
        `${idx + 1}. ${f.label} (${f.block}) – Severidad ${f.severity}`
      );
      if (f.note) lines.push(`   Observación: ${f.note}`);
    });
    lines.push("");
  }

  lines.push(
    "Nota: Este informe tiene carácter analítico-pericial y no sustituye la valoración jurídica de fondo."
  );

  return lines.join("\n");
}
