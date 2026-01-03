// ============================================================
// 🧠 Agenda Active State (ENTERPRISE – GENERIC – TTL SAFE)
// ------------------------------------------------------------
// RESPONSABILIDAD ÚNICA:
// - Guardar estado conversacional corto de agenda
// - Manejar expiración (TTL lógico)
// - NO contiene lógica de negocio
// ============================================================

import AgendaState from "../../models/AgendaState.js";

/* ------------------------------------------------------------
 * Utils
 * ---------------------------------------------------------- */
function normUserId(usuarioId) {
  if (!usuarioId) return null;
  return String(usuarioId);
}

/* ------------------------------------------------------------
 * SET ACTIVE STATE
 * ---------------------------------------------------------- */
/**
 * Guarda o actualiza el estado activo de agenda.
 * payload es completamente libre y definido por el caller.
 */
export async function setActiveAgendaState({
  usuarioId,
  type,
  payload = {},
  ttlMinutes = 10,
}) {
  const uid = normUserId(usuarioId);
  if (!uid || !type) return null;

  const expiresAt = new Date(Date.now() + ttlMinutes * 60_000);

  return AgendaState.findOneAndUpdate(
    { usuarioId: uid },
    {
      usuarioId: uid,
      type,
      payload,
      expiresAt,
      updatedAt: new Date(),
    },
    {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
    }
  ).lean();
}

/* ------------------------------------------------------------
 * GET ACTIVE STATE (TTL SAFE)
 * ---------------------------------------------------------- */
/**
 * Devuelve el estado activo si no ha expirado.
 * Limpia estados vencidos de forma defensiva.
 */
export async function getActiveAgendaState({ usuarioId }) {
  const uid = normUserId(usuarioId);
  if (!uid) return null;

  const now = new Date();

  const state = await AgendaState.findOne({
    usuarioId: uid,
    expiresAt: { $gt: now },
  }).lean();

  // Limpieza defensiva (por si TTL index falla)
  if (!state) {
    await AgendaState.deleteMany({
      usuarioId: uid,
      expiresAt: { $lte: now },
    });
    return null;
  }

  return state;
}

/* ------------------------------------------------------------
 * CLEAR STATE (hard reset)
 * ---------------------------------------------------------- */
export async function clearAgendaState(usuarioId) {
  const uid = normUserId(usuarioId);
  if (!uid) return null;

  return AgendaState.deleteMany({ usuarioId: uid });
}
