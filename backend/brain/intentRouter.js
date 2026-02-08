// ======================================================================
// 🧠 INTENT ROUTER — BRAIN LEVEL (R7.6 · CANONICAL)
// ----------------------------------------------------------------------
// SINGLE RESPONSIBILITY:
// - Detect the REAL user intent
// - Declare domain authority (LEGAL vs SYSTEM)
// - Enforce tool execution when mandatory
//
// CORE RULES:
// - The router DOES NOT reason
// - The router DOES NOT execute
// - If forceTool === true → runtime MUST NOT allow free text
// - ALL outputs are INTERNAL (English only)
// ======================================================================

export function detectIntent({ prompt = "", adjuntos = [] }) {
  const text = String(prompt).toLowerCase().trim();

  /* ============================================================
     0. EMPTY INPUT
  ============================================================ */
  if (!text && adjuntos.length === 0) {
    return {
      intent: "EMPTY_INPUT",
      domain: "SYSTEM",
      forceTool: false,
    };
  }

  /* ============================================================
     1. PDF / DOCUMENT EVIDENCE
     (PDF present → legal analysis flow)
  ============================================================ */
  if (adjuntos.some(a => a?.kind === "pdf")) {
    return {
      intent: "PDF_ANALYSIS",
      domain: "LEGAL",
      forceTool: false,
    };
  }

  /* ============================================================
     2. AGENDA — STRONG ACTION (MANDATORY TOOL)
     Requirements:
     - Imperative verb
     - Agenda-related object
  ============================================================ */
  const hasAgendaVerb =
    /\b(agenda|agendar|programa|programar|fija|crear|registra|registrar|reprograma|reprogramar|cancela|cancelar)\b/i.test(
      text
    );

  const hasAgendaObject =
    /\b(audiencia|cita|evento|plazo|vencimiento|recordatorio)\b/i.test(text);

  if (hasAgendaVerb && hasAgendaObject) {
    return {
      intent: "AGENDA_ACTION",
      domain: "SYSTEM",
      forceTool: true, // 🔴 mandatory
    };
  }

  /* ============================================================
     3. AGENDA — QUERY / MENTION (NO TOOL, NO KERNEL)
     Examples:
     - “What about the hearing?”
     - “Check my agenda”
  ============================================================ */
  if (
    /\b(audiencia|cita|plazo|vencimiento|calendario|agenda)\b/i.test(text)
  ) {
    return {
      intent: "AGENDA_QUERY",
      domain: "SYSTEM",
      forceTool: false,
    };
  }

  /* ============================================================
     4. LEGAL DOCUMENT REQUEST
  ============================================================ */
  if (
    /\b(demanda|apelaci[oó]n|recurso|escrito|informe|contrato|contestación|alegato)\b/i.test(
      text
    )
  ) {
    return {
      intent: "LEGAL_DOCUMENT",
      domain: "LEGAL",
      forceTool: false,
    };
  }

  /* ============================================================
     5. DEFAULT — GENERAL LEGAL CONSULTATION
  ============================================================ */
  return {
    intent: "LEGAL_CONSULTATION",
    domain: "LEGAL",
    forceTool: false,
  };
}

export default detectIntent;
