// ============================================================================
// 🦉 briefingBuilder — FASE 9 Briefing jurídico exportable
// ----------------------------------------------------------------------------
// - NO redacta escritos
// - NO decide
// - SOLO estructura información jurídica validada
// ============================================================================

export function buildJudicialBriefing({
  caseSession,
  strategy,
  timeline,
  tensions,
  resilience,
  maneuvers,
  noReturn,
  redLines,
  decisionPrep,
}) {
  return {
    header: {
      caseId: caseSession._id,
      title: caseSession.title || "Caso sin título",
      generatedAt: new Date().toISOString(),
    },

    sections: [
      {
        key: "strategy",
        title: "Lectura estratégica del caso",
        content: strategy?.summary || "—",
      },
      {
        key: "facts",
        title: "Hechos relevantes auditados",
        content: timeline.map((e) => ({
          date: e.at,
          type: e.type,
          description: e.payload || null,
        })),
      },
      {
        key: "tensions",
        title: "Tensiones del caso",
        content: tensions?.tensions || [],
      },
      {
        key: "resilience",
        title: "Puntos de resiliencia",
        content: resilience?.points || [],
      },
      {
        key: "maneuvers",
        title: "Zonas de maniobra estratégica",
        content: maneuvers?.zones || [],
      },
      {
        key: "noReturn",
        title: "Puntos de no retorno",
        content: noReturn?.points || [],
      },
      {
        key: "redLines",
        title: "Líneas rojas del caso",
        content: redLines?.redLines || [],
      },
      {
        key: "decision",
        title: "Consideraciones para decisión humana",
        content: decisionPrep?.considerations || {},
      },
    ],
  };
}
