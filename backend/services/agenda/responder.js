// ============================================================================
// 🗓️ responder.js — ORQUESTADOR DE AGENDA (CANÓNICO FINAL · 2026)
// ----------------------------------------------------------------------------
// RESPONSABILIDAD ÚNICA:
// - Orquestar acciones (CREATE / MODIFY / QUERY)
// - Delegar persistencia + dedupe + validación al REPO (repo.js)
// - NO generar lenguaje humano
// - NO interpretar intención (eso es del LLM)
// ============================================================================

import AgendaEvent from "../../models/AgendaEvent.js";
import {
  persistAgendaEventFromDraft,
  findAgendaEventsByDay,
  findAgendaEventsByRange,
} from "./repo.js";

// ---------------------------------------------------------------------------
// Utils mínimos (NO lógica de negocio)
// ---------------------------------------------------------------------------

const safeStr = (v, max = 2000) =>
  typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null;

function hasBothISO(startISO, endISO) {
  return typeof startISO === "string" && typeof endISO === "string";
}

// ---------------------------------------------------------------------------
// MAIN
// ---------------------------------------------------------------------------

export async function handleAgenda({
  action,
  usuarioId,
  expedienteId = null,
  userTimeZone = "America/Lima",
}) {
  if (!action || !action.type) return null;

  // ========================================================================
  // CREATE — desde draft IA (idempotencia/validación via repo.js)
  // ========================================================================
  if (action.type === "CREATE_FROM_DRAFT") {
    if (!usuarioId) return null;

    const draft = action.draft || {};

    const payload = {
      usuarioId,
      expedienteId: expedienteId || null,

      title: safeStr(draft.title, 160) || "Evento",
      notes: safeStr(draft.notes ?? draft.description ?? "", 2000) || "",

      startISO: draft.startISO,
      endISO: draft.endISO,

      userTimeZone,
      tz: userTimeZone,
    };

    // El repo devuelve:
    // - evento creado
    // - o evento existente (dedupe)
    // - o null si el draft es inválido
    const event = await persistAgendaEventFromDraft(payload);

    return event || null;
  }

  // ========================================================================
  // MODIFY — compat/legacy (solo si ya tienes eventId)
  // NOTA: el contrato fuerte es CREATE idempotente. MODIFY es puente.
  // ========================================================================
  if (action.type === "MODIFY") {
    const patch = action.patch || {};
    const eventId = patch.eventId;

    if (!eventId) return null;

    const existing = await AgendaEvent.findById(eventId);
    if (!existing) return null;

    const finalTitle = safeStr(patch.title, 160);
    const finalNotes = safeStr(patch.notes ?? patch.description, 2000);

    if (finalTitle) existing.title = finalTitle;

    if (finalNotes !== null) {
      existing.notes = finalNotes;
      existing.description = finalNotes; // legacy espejo si existe en schema
    }

    // Reprogramación solo si vienen ambos ISO
    if (hasBothISO(patch.startISO, patch.endISO)) {
      existing.startISO = patch.startISO;
      existing.endISO = patch.endISO;
      // OJO: si tu schema recalcula startUnix/endUnix/dueLocalDay en pre-save,
      // esto es suficiente. Si NO lo hace, entonces el contrato está en schema/repo,
      // no aquí.
    }

    await existing.save();
    return existing.toObject();
  }

  // ========================================================================
  // QUERY — usa el contrato de repo.js (por día o rango de días)
  // ========================================================================
  if (action.type === "QUERY") {
    if (!usuarioId) return [];

    const q = action.query || {};

    // 1) Query por día (si te mandan day)
    if (q.day) {
      return await findAgendaEventsByDay({
        usuarioId,
        expedienteId: expedienteId || null,
        dayISO: q.day,
      });
    }

    // 2) Query por rango (start/end son DAY ISO según tu repo)
    if (q.start && q.end) {
      return await findAgendaEventsByRange({
        usuarioId,
        expedienteId: expedienteId || null,
        startDayISO: q.start,
        endDayISO: q.end,
      });
    }

    return [];
  }

  return null;
}

export default handleAgenda;
