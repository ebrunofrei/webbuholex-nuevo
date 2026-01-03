// ============================================================
// 🧠 useCognitiveInput — Estado cognitivo del input
// ============================================================

export function useCognitiveInput({ mode, botState }) {
  /**
   * mode:
   * - "consulta"
   * - "analisis"
   * - "estrategia"
   * - "redaccion"
   * - "auditoria"
   *
   * botState:
   * - idle
   * - thinking
   * - drafting
   */

  if (botState === "thinking") {
    return {
      placeholder: "Analizando… puedes seguir escribiendo si deseas",
      locked: false,
      hint: "El sistema está procesando información",
    };
  }

  if (botState === "drafting") {
    return {
      placeholder: "Redactando documento… evita enviar nuevos mensajes",
      locked: true,
      hint: "Documento en elaboración",
    };
  }

  switch (mode) {
    case "analisis":
      return {
        placeholder:
          "Describe los hechos, el contexto jurídico y los puntos en disputa…",
        locked: false,
        hint: "Fase de análisis",
      };

    case "estrategia":
      return {
        placeholder:
          "Plantea objetivos, riesgos, alternativas y escenarios posibles…",
        locked: false,
        hint: "Fase estratégica",
      };

    case "redaccion":
      return {
        placeholder:
          "Indica el tipo de escrito, tono y pretensión jurídica…",
        locked: false,
        hint: "Fase de redacción",
      };

    case "auditoria":
      return {
        placeholder:
          "Indica qué parte del caso deseas auditar o someter a control…",
        locked: false,
        hint: "Auditoría jurídica",
      };

    default:
      return {
        placeholder:
          "Describe el caso, plantea la estrategia o adjunta documentos…",
        locked: false,
        hint: null,
      };
  }
}
