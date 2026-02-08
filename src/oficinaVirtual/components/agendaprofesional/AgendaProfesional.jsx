// src/oficinaVirtual/components/agendaprofesional/AgendaProfesional.jsx
// ======================================================================
// 🦉 AgendaProfesional – BúhoLex Enterprise v5.0 (CLEAN + PRO UX)
// CORE ya dividido: utils + modals + este componente principal
// ======================================================================

import React, { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { Calendar, dateFnsLocalizer } from "react-big-calendar";

import format from "date-fns/format";
import parse from "date-fns/parse";
import startOfWeek from "date-fns/startOfWeek";
import getDay from "date-fns/getDay";
import es from "date-fns/locale/es";
import "react-big-calendar/lib/css/react-big-calendar.css";

import { useAuth } from "@/context/AuthContext";

import { fetchAgendaMongoRango } from "@/services/agendaService";
import {
  fetchAgendaEventosRango,
  createAgendaEvento,
  updateAgendaEvento,
  updateAgendaEventoStatus,
  deleteAgendaEvento,
} from "@/services/agendaEventosMongoService";

// utils
import {
  safeDate,
  toYMD,
  normalizeRange,
  ddmmyyyyToISO,
  normalizeHHMM,
  isValidISODate,
  isValidTime,
  parseDateTimeLocal,
  plazoToCalendarEvent,
  manualToCalendarEvent,
} from "./agenda.utils.js";

// modals / components
import { EventChip, DayModal, ActionModal, EventModal } from "./AgendaModals.jsx";
import { buildAgendaEvento } from "./agenda.utils.js";

// ======================================================================
// Localizer
// ======================================================================
const locales = { es };
const localizer = dateFnsLocalizer({ format, parse, startOfWeek, getDay, locales });

// ======================================================================
// COMPONENTE PRINCIPAL
// ======================================================================
export default function AgendaProfesional({
  usuarioId: usuarioIdProp,
  tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
  from: fromProp,
  to: toProp,
  onMonthChange,
}) {
  const { user } = useAuth();
  const usuarioId = usuarioIdProp || user?.uid || null;

  // =========================
  // Data
  // =========================
  const [eventos, setEventos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hidePastPlazos, setHidePastPlazos] = useState(true);

  // =========================
  // Calendar controlled
  // =========================
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const currentDateRef = useRef(currentDate);
  useEffect(() => {
    currentDateRef.current = currentDate;
  }, [currentDate]);

  const viewRef = useRef("month");
  const rangeRef = useRef(normalizeRange(null, "month", tz, currentDate));

  // =========================
  // Modales
  // =========================
  const [actionOpen, setActionOpen] = useState(false);
  const [selectedRaw, setSelectedRaw] = useState(null);
  const [selectedType, setSelectedType] = useState(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);

  // =========================
  // Form
  // =========================
  const initialForm = useMemo(
    () => ({
      title: "",
      dateText: "",
      timeText: "",
      notes: "",
      telefono: "",
      alertaWhatsapp: false,
    }),
    []
  );

  const [form, setForm] = useState(initialForm);
  const [formError, setFormError] = useState("");

  // =========================
  // DayModal
  // =========================
  const [dayOpen, setDayOpen] = useState(false);
  const [dayDate, setDayDate] = useState(null);

  const openDayModal = useCallback((dateLike) => {
    setDayDate(safeDate(dateLike));
    setDayOpen(true);
  }, []);

  const closeDayModal = useCallback(() => {
    setDayOpen(false);
    setDayDate(null);
  }, []);

  const eventosDelDia = useMemo(() => {
    if (!dayDate) return [];
    const ymd = toYMD(dayDate, tz);
    return (eventos || [])
      .filter((e) => toYMD(e.start, tz) === ymd)
      .sort((a, b) => safeDate(a.start).getTime() - safeDate(b.start).getTime());
  }, [dayDate, eventos, tz]);

  // ======================================================================
  // Form helpers (CLAVE DEL FIX)
  // ======================================================================
  const resetForm = useCallback(
    (seedDate = null) => {
      if (!seedDate) {
        setForm({ ...initialForm });
      } else {
        const d = safeDate(seedDate);
        const dd = String(d.getDate()).padStart(2, "0");
        const mm = String(d.getMonth() + 1).padStart(2, "0");
        const yyyy = String(d.getFullYear());
        const hh = String(d.getHours()).padStart(2, "0");
        const mi = String(d.getMinutes()).padStart(2, "0");

        setForm({
          ...initialForm,
          dateText: `${dd}/${mm}/${yyyy}`,
          timeText: `${hh}:${mi}`,
        });
      }
      setFormError("");
      setEditingId(null);
    },
    [initialForm]
  );

  // 👉 Botón principal: modal LIMPIO (sin autoseed)
  const openNewEventModal = useCallback(() => {
    resetForm(null);
    setModalOpen(true);
  }, [resetForm]);

  const closeNewEventModal = useCallback(() => {
    setModalOpen(false);
    setEditingId(null);
    setFormError("");
  }, []);

  // ======================================================================
  // Loaders (DEBEN IR ANTES que syncLoadForDate)
  // ======================================================================
  const cargar = useCallback(
    async (range) => {
      if (!usuarioId || !range?.from || !range?.to) return;

      setLoading(true);
      try {
        const [plazos, manuales] = await Promise.all([
          fetchAgendaMongoRango({ usuarioId, ...range, tz }),
          fetchAgendaEventosRango({ usuarioId, ...range, tz }),
        ]);

        const nowUnix = Math.floor(Date.now() / 1000);

        const e1 = (plazos || [])
          .map(plazoToCalendarEvent)
          .filter((e) => {
            if (!hidePastPlazos) return true;
            return (e.resource?.raw?.endUnix || 0) >= nowUnix - 86400;
          });

        const e2 = (manuales || []).map(manualToCalendarEvent);

        setEventos([...e1, ...e2]);
      } catch (err) {
        console.error("AgendaProfesional.cargar error:", err);
        setEventos([]);
      } finally {
        setLoading(false);
      }
    },
    [usuarioId, tz, hidePastPlazos]
  );

  // ✅ ahora sí: syncLoadForDate ya puede depender de cargar
  const syncLoadForDate = useCallback(
    async (date, viewMaybe) => {
      const v = viewMaybe || viewRef.current;
      const d = safeDate(date);

      // 👇 importante: mantener calendar controlado
      setCurrentDate(d);

      const range = normalizeRange(null, v, tz, d);
      rangeRef.current = range;

      await cargar(range);
      onMonthChange?.(d);
    },
    [tz, cargar, onMonthChange]
  );

  useEffect(() => {
    if (!usuarioId) return;

    const r =
      fromProp && toProp
        ? { from: fromProp, to: toProp }
        : normalizeRange(null, viewRef.current, tz, currentDateRef.current);

    rangeRef.current = r;
    cargar(r);
  }, [usuarioId, fromProp, toProp, tz, cargar]);

  // ======================================================================
  // ActionModal handlers (botones clickeables)
  // ======================================================================
  const closeActionModal = useCallback(() => {
    setActionOpen(false);
    setSelectedRaw(null);
    setSelectedType(null);
  }, []);

  const openEditFromRaw = useCallback(
    (raw) => {
      if (!raw?._id) return;

      const startD = safeDate(raw.startISO || raw.dueLocalDay || new Date());

      const dd = String(startD.getDate()).padStart(2, "0");
      const mm = String(startD.getMonth() + 1).padStart(2, "0");
      const yyyy = String(startD.getFullYear());
      const hh = String(startD.getHours()).padStart(2, "0");
      const mi = String(startD.getMinutes()).padStart(2, "0");

      setEditingId(raw._id);
      setForm({
        title: raw.title || "",
        dateText: `${dd}/${mm}/${yyyy}`,
        timeText: `${hh}:${mi}`,
        notes: raw.notes || raw.description || "",
        telefono: raw.telefono || "",
        alertaWhatsapp: !!raw.alertaWhatsapp,
      });

      setFormError("");
      setModalOpen(true);
    },
    [setForm]
  );

  const doDuplicate = useCallback(async () => {
  if (!selectedRaw?._id) return;

  const startDate = safeDate(selectedRaw.startISO || new Date());

  const payload = buildAgendaEvento({
    usuarioId,
    tz,
    title: `${selectedRaw.title || ""} (copia)`,
    startDate,
    notes: selectedRaw.notes || selectedRaw.description || "",
    telefono: selectedRaw.telefono,
    alertaWhatsapp: selectedRaw.alertaWhatsapp,
  });

  await createAgendaEvento(payload);

  closeActionModal();
  await syncLoadForDate(startDate, viewRef.current);
}, [selectedRaw, usuarioId, tz, closeActionModal, syncLoadForDate]);

  const doDone = useCallback(async () => {
    if (!selectedRaw?._id) return;
    await updateAgendaEventoStatus({ id: selectedRaw._id, status: "done" });
    closeActionModal();
    await syncLoadForDate(currentDateRef.current, viewRef.current);
  }, [selectedRaw, closeActionModal, syncLoadForDate]);

  const doCancel = useCallback(async () => {
    if (!selectedRaw?._id) return;
    await updateAgendaEventoStatus({ id: selectedRaw._id, status: "canceled" });
    closeActionModal();
    await syncLoadForDate(currentDateRef.current, viewRef.current);
  }, [selectedRaw, closeActionModal, syncLoadForDate]);

  const doDelete = useCallback(async () => {
  if (!selectedRaw?._id) return;

  const ok = window.confirm("¿Eliminar este evento definitivamente?");
  if (!ok) return;

  // ✅ 1) UI optimista: lo saco del calendario AL INSTANTE
  const deletedId = String(selectedRaw._id);
    setEventos((prev) =>
    (prev || []).filter((e) => {
      const rid =
        e?.resource?.raw?._id ||
        e?.raw?._id ||
        null;
      return String(rid) !== deletedId;
    })
  );

  try {
    // ✅ 2) Backend: borro de verdad (incluye tz por compat)
    await deleteAgendaEvento({ id: selectedRaw._id, usuarioId, tz });
  } catch (err) {
    console.error("deleteAgendaEvento error:", err);
    // si falla, recargamos para no quedarnos en estado incoherente
    await syncLoadForDate(currentDateRef.current, viewRef.current);
  } finally {
    closeActionModal();
    // ✅ 3) Recargo final para asegurar consistencia
    await syncLoadForDate(currentDateRef.current, viewRef.current);
  }
}, [selectedRaw, usuarioId, tz, closeActionModal, syncLoadForDate]);

  // ======================================================================
  // Calendar handlers
  // ======================================================================
  const onSelectSlot = useCallback(
    ({ start, action }) => {
      const d = safeDate(start);

      // click simple en día => DayModal (NO crea evento)
      if (action === "click") {
        openDayModal(d);
        return;
      }

      // selección/drag => crear evento con seed
      resetForm(d);
      setModalOpen(true);
    },
    [openDayModal, resetForm]
  );

  // ======================================================================
  // Save (GUARDA REAL, UNA SOLA VEZ)
  // ======================================================================
  const guardar = useCallback(async () => {
  if (!usuarioId) return;

  const title = String(form.title || "").trim();
  const dateISO = ddmmyyyyToISO(form.dateText);
  const time = normalizeHHMM(form.timeText);

  if (!title) return setFormError("Escribe un título.");
  if (!isValidISODate(dateISO)) return setFormError("Fecha inválida.");
  if (!isValidTime(time)) return setFormError("Hora inválida.");

  const startDate = parseDateTimeLocal(dateISO, time);
  if (!startDate) return setFormError("No se pudo interpretar fecha/hora.");

  let payload;
  try {
    payload = buildAgendaEvento({
      usuarioId,
      tz,
      title,
      startDate,
      notes: form.notes,
      telefono: form.telefono,
      alertaWhatsapp: form.alertaWhatsapp,
    });
  } catch (e) {
    return setFormError(e.message);
  }

  if (editingId) {
    await updateAgendaEvento({ id: editingId, ...payload });
  } else {
    await createAgendaEvento(payload);
  }

  setModalOpen(false);
  resetForm(null);
  await syncLoadForDate(startDate, viewRef.current);
}, [usuarioId, tz, form, editingId, resetForm, syncLoadForDate]);

  // ======================================================================
  // Render
  // ======================================================================
  return (
    <div className="p-4 max-w-6xl mx-auto">
      <div className="flex justify-between mb-3">
        <div>
          <div className="text-lg font-bold text-[#5C2E0B]">Agenda</div>

          <label className="text-xs">
            <input
              type="checkbox"
              checked={hidePastPlazos}
              onChange={(e) => setHidePastPlazos(e.target.checked)}
            />{" "}
            Ocultar plazos vencidos
          </label>

          {loading ? <div className="text-xs opacity-70 mt-1">Cargando…</div> : null}
        </div>

        <button
          className="px-4 py-2 rounded-lg bg-[#5C2E0B] text-white"
          onClick={openNewEventModal}
          type="button"
        >
          + Nuevo evento
        </button>
      </div>

      <Calendar
        localizer={localizer}
        events={eventos}
        startAccessor="start"
        endAccessor="end"
        selectable
        date={currentDate}
        onNavigate={(d) => syncLoadForDate(d, viewRef.current)}
        onSelectSlot={onSelectSlot}
        onSelectEvent={(ev) => {
          const resource = ev?.resource || {};
          const raw = resource.raw || ev.raw || null;
          const type = resource.type || "manual";

          if (!raw || !raw._id) return;

          setSelectedRaw(raw);
          setSelectedType(type);
          setActionOpen(true);
        }}
        eventPropGetter={(event) => {
          const endUnix = event?.resource?.raw?.endUnix;
          if (!endUnix) return {};
          const rem = endUnix - Date.now() / 1000;

          let bg = "#3aa655";
          let color = "#fff";

          if (rem <= 7200) bg = "#b03a1a";
          else if (rem <= 43200) {
            bg = "#f2c200";
            color = "#5C2E0B";
          }

          return {
            style: {
              background: bg,
              color,
              borderRadius: 8,
              border: "1px solid rgba(0,0,0,0.06)",
              fontWeight: 800,
            },
          };
        }}
        components={{ event: EventChip }}
        style={{ height: 600 }}
      />

      <DayModal
        open={dayOpen}
        onClose={closeDayModal}
        date={dayDate}
        events={eventosDelDia}
        tz={tz}
        onNewEvent={() => {
          resetForm(dayDate);
          setModalOpen(true);
        }}
        onOpenEvent={(ev) => {
          const raw = ev?.resource?.raw;
          const type = ev?.resource?.type;
          if (!raw) return;
          setSelectedRaw(raw);
          setSelectedType(type);
          setActionOpen(true);
        }}
      />

      <ActionModal
        open={actionOpen}
        raw={selectedRaw}
        type={selectedType}
        onClose={closeActionModal}
        onEdit={() => {
          const raw = selectedRaw;
          const type = selectedType;
          closeActionModal();
          if (type === "manual" && raw) openEditFromRaw(raw);
        }}
        onDuplicate={doDuplicate}
        onDone={doDone}
        onCancel={doCancel}
        onDelete={doDelete}
      />

      <EventModal
        open={modalOpen}
        onClose={closeNewEventModal}
        onSave={guardar}
        editing={!!editingId}
        form={form}
        setForm={setForm}
        formError={formError}
      />
    </div>
  );
}
