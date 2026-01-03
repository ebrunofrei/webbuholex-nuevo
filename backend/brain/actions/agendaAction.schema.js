// ======================================================================
// 🗓️ AGENDA_ACTION_SCHEMA — CANÓNICO
// ----------------------------------------------------------------------
// Define el CONTRATO, no la implementación.
// op es un STRING, validado en runtime.
// ======================================================================

export const AGENDA_ACTION_SCHEMA = {
  type: "AGENDA",
  op: "CREATE | QUERY | UPDATE | DELETE | REMINDER",
};
