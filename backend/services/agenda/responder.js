// ============================================================
// 🗓️ Agenda Responder – ENTERPRISE CANONICAL
// ============================================================
// REGLAS:
// 0) FOLLOW-UP activo tiene prioridad absoluta
// 1) Agenda SOLO entra por invocación explícita
// 2) CREATE = Fecha + Hora
// 3) QUERY = intención temporal clara
// 4) Sin agenda → handled:false
// ============================================================

import {
  setActiveAgendaState,
  getActiveAgendaState,
  clearAgendaState,
} from "./agendaState.js";

import {
  extractAgendaDraftFromText,
  extractDayISOFromText,
  extractRangeFromText,
  extractPeriodFromText,
  extractNextWeekRange,
  extractOffsetRange,
} from "./parser.js";

import {
  persistAgendaEventFromDraft,
  findAgendaEventsByDay,
  findAgendaEventsByRange,
  setReminderOnEventById,
} from "./repo.js";

import { isSemanticDuplicate } from "./duplicateDetector.js";

/* =========================
   Utils
========================= */
const yesRegex = /\b(s[ií]|si|ok|dale|listo|confirmo|ponle|activa)\b/i;
const noRegex  = /\b(no|nop|mejor no|cancelar|no gracias|desactiva)\b/i;

const normText = (v) => String(v || "").replace(/\s+/g, " ").trim();

const oneLine = (str = "", max = 140) =>
  str.length > max ? str.slice(0, max - 1) + "…" : str;

const hhmmFromISO = (iso = "") =>
  typeof iso === "string" ? iso.match(/T(\d{2}:\d{2})/)?.[1] || "" : "";

function renderAgendaList({ events = [] }) {
  if (!events.length) return "No tienes eventos en ese período.";

  return (
    "Tienes:\n" +
    events.slice(0, 8).map(e =>
      `• ${oneLine(e.title)} (${e.dueLocalDay} ${hhmmFromISO(e.startISO)})`
    ).join("\n")
  );
}

/* =========================
   API PRINCIPAL
========================= */
export async function handleAgenda({ action, usuarioId, expedienteId }) {
  switch (action.op) {
    case "CREATE":
      return createEvent(action.payload, usuarioId, expedienteId);

    case "QUERY":
      return queryEvents(action.payload, usuarioId);

    case "REMINDER":
      return setReminder(action.payload);

    default:
      return { handled: false };
  }

  // ------------------------------------------------------------
  // 0️⃣ FOLLOW-UP ACTIVO (PRIORIDAD ABSOLUTA)
  // ------------------------------------------------------------
  const activeState = await getActiveAgendaState({ usuarioId });

  if (activeState?.type === "DUPLICATE_CONFIRM") {
    const wantsReplace = yesRegex.test(texto);
    const wantsKeep = noRegex.test(texto);

    if (wantsReplace && activeState.pendingDraft) {
      const saved = await persistAgendaEventFromDraft(activeState.pendingDraft);

      await clearAgendaState(usuarioId);
      await setActiveAgendaState({
        usuarioId,
        type: "ASK_REMINDER",
        eventId: saved._id,
      });

      return {
        handled: true,
        reply:
          `Perfecto. Usaré el nuevo evento: ${oneLine(saved.title)} ` +
          `(${saved.dueLocalDay} ${hhmmFromISO(saved.startISO)}). ` +
          `¿Activo recordatorio?`,
      };
    }

    if (wantsKeep) {
      await clearAgendaState(usuarioId);
      return { handled: true, reply: "De acuerdo. Mantengo el evento existente 👍" };
    }

    return {
      handled: true,
      reply: "Tengo dos eventos parecidos. ¿Uso el nuevo o mantengo el existente?",
    };
  }

  if (activeState?.type === "ASK_REMINDER") {
    if (yesRegex.test(texto)) {
      await setReminderOnEventById({
        eventId: activeState.eventId,
        on: true,
        minutesBefore: [120],
        channel: "whatsapp",
      });

      await clearAgendaState(usuarioId);
      return { handled: true, reply: "Perfecto. Recordatorio activado 👍" };
    }

    if (noRegex.test(texto)) {
      await clearAgendaState(usuarioId);
      return { handled: true, reply: "De acuerdo. Sin recordatorio." };
    }

    return { handled: true, reply: "¿Activo recordatorio? (sí / no)" };
  }

  // ------------------------------------------------------------
  // 1️⃣ INVOCACIÓN EXPLÍCITA DE AGENDA (GUARD CANÓNICO)
  // ------------------------------------------------------------
  const agendaInvokeRegex =
  /\b(agenda|agendar|programar|crear\s+(un\s+)?evento|ver\s+(agenda|eventos)|mis\s+(eventos|citas|plazos))\b/i;

  if (!agendaInvokeRegex.test(texto)) {
    return { handled: false };
  }

  // ------------------------------------------------------------
  // 2️⃣ CREATE – FECHA + HORA
  // ------------------------------------------------------------
  const draft = extractAgendaDraftFromText(texto, {
    usuarioId,
    expedienteId,
    userTimeZone,
    tzOffset,
  });

  if (draft) {
    const dayISO = draft.startISO.slice(0, 10);

    const sameDay = await findAgendaEventsByDay({ usuarioId, dayISO });
    const duplicate = sameDay.find(ev => isSemanticDuplicate(draft, ev));

    if (duplicate) {
      await setActiveAgendaState({
        usuarioId,
        type: "DUPLICATE_CONFIRM",
        eventId: duplicate._id,
        pendingDraft: draft,
      });

      return {
        handled: true,
        reply:
          `Ya tengo algo parecido:\n` +
          `• ${oneLine(duplicate.title)} (${duplicate.dueLocalDay} ${hhmmFromISO(
            duplicate.startISO
          )})\n\n¿Uso el nuevo o mantengo el existente?`,
      };
    }

    const saved = await persistAgendaEventFromDraft(draft);

    await setActiveAgendaState({
      usuarioId,
      type: "ASK_REMINDER",
      eventId: saved._id,
    });

    return {
      handled: true,
      reply:
        `Listo. Evento agendado: ${oneLine(saved.title)} ` +
        `(${saved.dueLocalDay} ${hhmmFromISO(saved.startISO)}). ` +
        `¿Activo recordatorio?`,
    };
  }

  // ------------------------------------------------------------
  // 3️⃣ QUERY – TEMPORAL (ORDEN ESTRICTO)
  // ------------------------------------------------------------
  const nextWeek = extractNextWeekRange(texto, userTimeZone);
  if (nextWeek) {
    return {
      handled: true,
      reply: renderAgendaList({
        events: await findAgendaEventsByRange({
          usuarioId,
          startDayISO: nextWeek.startDayISO,
          endDayISO: nextWeek.endDayISO,
        }),
      }),
    };
  }

  const offset = extractOffsetRange(texto, userTimeZone);
  if (offset) {
    return {
      handled: true,
      reply: renderAgendaList({
        events: await findAgendaEventsByDay({
          usuarioId,
          dayISO: offset.startDayISO,
        }),
      }),
    };
  }

  const range = extractRangeFromText(texto);
  if (range?.startDayISO) {
    return {
      handled: true,
      reply: renderAgendaList({
        events: await findAgendaEventsByRange({
          usuarioId,
          startDayISO: range.startDayISO,
          endDayISO: range.endDayISO,
        }),
      }),
    };
  }

  const period = extractPeriodFromText(texto, new Date());
  if (period?.startDayISO) {
    return {
      handled: true,
      reply: renderAgendaList({
        events: await findAgendaEventsByRange({
          usuarioId,
          startDayISO: period.startDayISO,
          endDayISO: period.endDayISO,
        }),
      }),
    };
  }

  const dayISO = extractDayISOFromText(texto);
  if (dayISO) {
    return {
      handled: true,
      reply: renderAgendaList({
        events: await findAgendaEventsByDay({ usuarioId, dayISO }),
      }),
    };
  }

  // ------------------------------------------------------------
  // 4️⃣ FALLBACK LIMPIO
  // ------------------------------------------------------------
  return { handled: false };
}
