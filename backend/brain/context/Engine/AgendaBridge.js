// ======================================================================
// 📅 AgendaBridge.js — R7.7++ (Canonical)
// ----------------------------------------------------------------------
// Passive bridge for authoritative agenda data.
//
// RESPONSIBILITIES:
// - Emit structured agenda state ONLY if provided
// - Never reason, infer, interpret, or generate human text
// - Provide purely internal, machine-oriented metadata
//
// NON-RESPONSIBILITIES:
// - No NLP
// - No explanation
// - No assumptions
// - No fallback logic
//
// INTERNAL LANGUAGE: English only
// ======================================================================

/**
 * @param {Object} params
 * @param {Array}  params.agendaData - List of real agenda events from DB/API
 * @param {Object} params.period     - { from: ISOString, to: ISOString }
 * @param {String} params.status     - "connected" | "error"
 *
 * @returns {Object|null} INTERNAL block for LLMContextEngine
 */
export function AgendaBridge({
  agendaData = [],
  period = { from: null, to: null },
  status = "connected",
}) {
  // --------------------------------------------------
  // 1. Required fields
  // --------------------------------------------------
  if (!period?.from || !period?.to) return null;

  // --------------------------------------------------
  // 2. Normalize events (no text generation)
  // --------------------------------------------------
  const events =
    Array.isArray(agendaData)
      ? agendaData.map(ev => ({
          date: ev.date || null,
          title: ev.title || null,
          description: ev.description || null,
        }))
      : [];

  // --------------------------------------------------
  // 3. Emit INTERNAL structured block
  // --------------------------------------------------
  return {
    type: "agenda-context",
    version: "R7.7",
    period,
    status,
    count: events.length,
    events,
    authoritative: true,
    internal: true,
  };
}

export default AgendaBridge;
