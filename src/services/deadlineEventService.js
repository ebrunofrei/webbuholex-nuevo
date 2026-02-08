// ============================================================
// 🗓️ deadlineEventService — CANONICAL PROXY
// ------------------------------------------------------------
// ⚠️ ARCHIVO LEGACY COMPAT
// - NO lógica propia
// - DELEGA 100% a agendaService
// - Mantiene imports existentes sin romper UI
// ============================================================

import {
  fetchAgendaRango,
  fetchAgendaHoy,
  normalizeAgendaEvent,
} from "./agendaService.js";

/**
 * LEGACY API
 * ------------------------------------------------------------
 * Antes: Mongo directo
 * Ahora: proxy canónico
 */

// ============================================================
// 📆 RANGO (Mes / Semana / Vista)
// ============================================================
export async function fetchAgendaRangoMongo({
  usuarioId,
  sessionId,       // 🔑 OBLIGATORIO
  from,
  to,
  tz = "America/Lima",
  token = null,
  signal = null,
} = {}) {
  const items = await fetchAgendaRango({
    usuarioId,
    sessionId,
    from,
    to,
    tz,
    token,
    signal,
  });

  // Normalización para FullCalendar / UI
  return items.map(normalizeAgendaEvent);
}

// ============================================================
// 📅 HOY
// ============================================================
export async function fetchAgendaHoyMongo({
  usuarioId,
  sessionId,       // 🔑 OBLIGATORIO
  tz = "America/Lima",
  token = null,
  signal = null,
} = {}) {
  const items = await fetchAgendaHoy({
    usuarioId,
    sessionId,
    tz,
    token,
    signal,
  });

  return items.map(normalizeAgendaEvent);
}
