// backend/brain/intentRouter.js
// ============================================================
// Intent Router – BRAIN LEVEL
// ============================================================

export function detectIntent({ prompt = "", adjuntos = [] }) {
  const t = String(prompt || "").toLowerCase().trim();

  if (adjuntos.some(a => a.kind === "pdf")) {
    return { intent: "analisis_pdf" };
  }

  if (
    /\b(agendar|agenda|programar|recordar|audiencia|cita|plazo|vencimiento|calendario)\b/i.test(t)
  ) {
    return { intent: "agenda" };
  }

  if (/\b(demanda|apelaci[oó]n|recurso|escrito|informe|contrato)\b/i.test(t)) {
    return { intent: "documento" };
  }

  return { intent: "consulta_juridica" };
}
