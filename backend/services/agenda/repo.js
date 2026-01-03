// ============================================================
// 🗂️ Repo Mongo – AGENDA (ENTERPRISE · CANÓNICO 2025)
// ------------------------------------------------------------
// ✔ sessionId = expedienteId = case_<caseId> (FUENTE ÚNICA)
// ✔ notes = fuente única de texto (description solo legacy)
// ✔ ISO / UNIX blindado
// ✔ Dedupe real
// ✔ Queries coherentes con sesión
// ============================================================

import AgendaEvent from "../../models/AgendaEvent.js";

const DEFAULT_TZ = "America/Lima";
const DEFAULT_TZ_OFFSET = "-05:00";

/* ============================================================
   🧹 Sanitizers
============================================================ */
function cleanStr(v = "", maxLen = 300) {
  const s = String(v ?? "").replace(/\s+/g, " ").trim();
  return s.length > maxLen ? s.slice(0, maxLen) : s;
}

function cleanLong(v = "", maxLen = 2000) {
  const s = String(v ?? "").replace(/\s+/g, " ").trim();
  return s.length > maxLen ? s.slice(0, maxLen) : s;
}

function normTZ(tz) {
  return cleanStr(tz, 64) || DEFAULT_TZ;
}

function isDayISO(day) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(day));
}

/* ============================================================
   ⏱ UNIX / ISO helpers
============================================================ */
function normalizeUnix(x) {
  const n = Number(x);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n > 20_000_000_000 ? Math.floor(n / 1000) : Math.floor(n);
}

function ensureISO(iso) {
  const s = cleanStr(iso, 64);
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(s)) return null;
  const t = new Date(s).getTime();
  return Number.isFinite(t) ? s : null;
}

function toUnixSeconds(iso) {
  const s = ensureISO(iso);
  return s ? Math.floor(new Date(s).getTime() / 1000) : null;
}

function dueLocalDayFromISO(iso) {
  return typeof iso === "string" && iso.length >= 10 ? iso.slice(0, 10) : null;
}

/* ============================================================
   🔐 SCOPE CANÓNICO
============================================================ */
function buildScope({ usuarioId, sessionId }) {
  if (
    !usuarioId ||
    typeof sessionId !== "string" ||
    !sessionId.startsWith("case_")
  ) {
    return null;
  }

  return {
    usuarioId: cleanStr(usuarioId, 120),
    expedienteId: sessionId,
    status: "active",
  };
}

/* ============================================================
   📌 Persistir evento desde draft (AGENDA IA)
============================================================ */
export async function persistAgendaEventFromDraft(draft = {}) {
  const usuarioId = cleanStr(draft.usuarioId, 120);
  const sessionId = cleanStr(draft.sessionId, 120);

  if (!usuarioId || !sessionId || !sessionId.startsWith("case_")) return null;

  const startISO = ensureISO(draft.startISO);
  const endISO = ensureISO(draft.endISO);
  if (!startISO || !endISO) return null;

  const startUnix = normalizeUnix(toUnixSeconds(startISO));
  const endUnix = normalizeUnix(toUnixSeconds(endISO));
  if (!startUnix || !endUnix || endUnix < startUnix) return null;

  const dueLocalDay = dueLocalDayFromISO(startISO);
  if (!isDayISO(dueLocalDay)) return null;

  const title = cleanStr(draft.title, 160) || "Evento";
  const notes = cleanLong(draft.notes || draft.description || "", 2000);
  const tz = normTZ(draft.userTimeZone);

  const scope = buildScope({ usuarioId, sessionId });
  if (!scope) return null;

  // ----------------------------------------------------------
  // 🛡️ DEDUPE (fuerte)
  // ----------------------------------------------------------
  const exact = await AgendaEvent.findOne({
    ...scope,
    title,
    startISO,
    dueLocalDay,
  }).lean();

  if (exact) return exact;

  const near = await AgendaEvent.findOne({
    ...scope,
    title,
    dueLocalDay,
    startUnix: { $gte: startUnix - 120, $lte: startUnix + 120 },
  }).lean();

  if (near) return near;

  // ----------------------------------------------------------
  // 🧾 CREATE DEFINITIVO
  // ----------------------------------------------------------
  const created = await AgendaEvent.create({
    usuarioId,
    expedienteId: sessionId,

    title,
    notes,
    description: notes, // legacy espejo

    startISO,
    endISO,
    startUnix,
    endUnix,

    dueLocalDay,
    tz,
    status: "active",
  });

  return created?.toObject?.() ?? created;
}

/* ============================================================
   📅 Eventos por día
============================================================ */
export async function findAgendaEventsByDay({
  usuarioId,
  sessionId,
  dayISO,
}) {
  const uid = cleanStr(usuarioId, 120);
  const day = cleanStr(dayISO, 10);

  if (!uid || !isDayISO(day) || !sessionId?.startsWith("case_")) return [];

  const scope = buildScope({ usuarioId: uid, sessionId });
  if (!scope) return [];

  return (
    (await AgendaEvent.find({
      ...scope,
      dueLocalDay: day,
    })
      .sort({ startUnix: 1 })
      .lean()) || []
  );
}

/* ============================================================
   📆 Eventos por rango de días
============================================================ */
export async function findAgendaEventsByRange({
  usuarioId,
  sessionId,
  startDayISO,
  endDayISO,
}) {
  const uid = cleanStr(usuarioId, 120);
  const a = cleanStr(startDayISO, 10);
  const b = cleanStr(endDayISO, 10);

  if (!uid || !isDayISO(a) || !isDayISO(b) || !sessionId?.startsWith("case_")) {
    return [];
  }

  const start = a <= b ? a : b;
  const end = a <= b ? b : a;

  const scope = buildScope({ usuarioId: uid, sessionId });
  if (!scope) return [];

  return (
    (await AgendaEvent.find({
      ...scope,
      dueLocalDay: { $gte: start, $lte: end },
    })
      .sort({ dueLocalDay: 1, startUnix: 1 })
      .lean()) || []
  );
}

/* ============================================================
   🕗 Último evento creado
============================================================ */
export async function findLatestAgendaEvent({ usuarioId, sessionId }) {
  const uid = cleanStr(usuarioId, 120);
  if (!uid || !sessionId?.startsWith("case_")) return null;

  const scope = buildScope({ usuarioId: uid, sessionId });
  if (!scope) return null;

  return (
    (await AgendaEvent.findOne(scope)
      .sort({ createdAt: -1 })
      .lean()) || null
  );
}

/* ============================================================
   🚨 Candidatos a alerta (por endUnix)
============================================================ */
export async function findAgendaAlertCandidates({
  usuarioId,
  sessionId,
  fromUnix,
  toUnix,
}) {
  const uid = cleanStr(usuarioId, 120);
  const f = normalizeUnix(fromUnix);
  const t = normalizeUnix(toUnix);

  if (!uid || !f || !t || t < f || !sessionId?.startsWith("case_")) return [];

  const scope = buildScope({ usuarioId: uid, sessionId });
  if (!scope) return [];

  return (
    (await AgendaEvent.find({
      ...scope,
      endUnix: { $gte: f, $lte: t },
    })
      .sort({ endUnix: 1 })
      .lean()) || []
  );
}

/* ============================================================
   🔔 Reminder toggle sobre último evento
============================================================ */
export async function setReminderOnLatestEvent({ usuarioId, sessionId, on = true }) {
  const uid = cleanStr(usuarioId, 120);
  if (!uid || !sessionId?.startsWith("case_")) return null;

  const scope = buildScope({ usuarioId: uid, sessionId });
  if (!scope) return null;

  return (
    (await AgendaEvent.findOneAndUpdate(
      scope,
      { $set: { alertaWhatsapp: Boolean(on) } },
      { sort: { createdAt: -1 }, new: true }
    ).lean()) || null
  );
}
// ============================================================
// 🔔 Reminder: set por ID (COMPAT / LEGACY)
// ============================================================
export async function setReminderOnEventById({
  eventId,
  on = true,
  minutesBefore = 120,
  channel = "whatsapp",
}) {
  if (!eventId) return null;

  const mins = Array.isArray(minutesBefore)
    ? minutesBefore
        .map((n) => Number(n))
        .filter((n) => Number.isFinite(n) && n > 0)
    : [Number(minutesBefore) || 120];

  const update = on
    ? {
        alertaWhatsapp: channel === "whatsapp",
        minutesBefore: mins,
      }
    : {
        alertaWhatsapp: false,
        minutesBefore: [],
      };

  const updated = await AgendaEvent.findByIdAndUpdate(
    eventId,
    { $set: update },
    { new: true }
  ).lean();

  return updated || null;
}
