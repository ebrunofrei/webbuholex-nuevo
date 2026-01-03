import { AGENDA_ACTION_OPS } from "./agendaActions.catalog.js";

if (!AGENDA_ACTION_OPS.includes(action.op)) {
  throw new Error(`Agenda op inválido: ${action.op}`);
}

export const AGENDA_ACTION_OPS = Object.freeze([
  "CREATE",
  "QUERY",
  "UPDATE",
  "DELETE",
  "REMINDER",
]);
