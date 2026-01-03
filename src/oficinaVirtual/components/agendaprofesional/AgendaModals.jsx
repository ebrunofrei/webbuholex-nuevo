import React from "react";
import { formatTimeHHmm, maskDDMMYYYY, maskHHMM } from "./agenda.utils.js";

export function EventChip({ event }) {
  const raw = event?.resource?.raw || {};
  const type = event?.resource?.type || "unknown";
  const time = raw?.startISO ? formatTimeHHmm(raw.startISO) : "";
  const label = String(event?.title || "").replace(/^⏳\s|^📌\s/, "").trim();

  return (
    <div className="flex items-center gap-2 min-w-0" title={label} style={{ lineHeight: 1.2 }}>
      <span className="text-[11px] font-bold opacity-90 shrink-0">
        {time || (type === "plazo" ? "PL" : "EV")}
      </span>
      <span className="text-[12px] font-semibold truncate min-w-0">{label}</span>
    </div>
  );
}

export function ActionModal({ open, onClose, raw, type, onEdit, onDuplicate, onDone, onCancel, onDelete }) {
  if (!open || !raw) return null;

  const desc = raw.notes || raw.description || "(sin notas)";
  const when = raw.startISO || raw.dueLocalDay || "(sin fecha)";
  const isManual = type === "manual";

  const onBackdrop = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-black/50 flex items-center justify-center p-4" onMouseDown={onBackdrop}>
      <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm opacity-70">Acciones</div>
            <span
              className={`text-xs px-2 py-1 rounded-full border ${
                isManual ? "border-[#5C2E0B] text-[#5C2E0B]" : "border-gray-300 text-gray-600"
              }`}
              title={isManual ? "Evento editable" : "Evento automático (plazo)"}
            >
              {isManual ? "MANUAL" : "AUTOMÁTICO"}
            </span>
          </div>

          <div className="text-lg font-bold text-[#5C2E0B] mt-1">{raw.title}</div>
          <div className="text-xs mt-1 opacity-80">📅 {when}</div>
          <div className="text-[11px] mt-1 opacity-60">
            id: <span className="font-mono">{raw._id}</span>
          </div>
        </div>

        <div className="p-4 max-h-[50vh] overflow-auto">
          <div className="text-sm font-semibold mb-2">Notas</div>
          <div className="text-sm whitespace-pre-wrap leading-relaxed">{desc}</div>
        </div>

        <div className="p-4 border-t flex flex-wrap gap-2 items-center">
          {isManual ? (
            <>
              <button className="px-4 py-2 rounded-lg bg-[#5C2E0B] text-white font-semibold" onClick={onEdit} type="button">
                Editar
              </button>
              <button className="px-4 py-2 rounded-lg border font-semibold" onClick={onDuplicate} type="button">
                Duplicar
              </button>
              <button className="px-4 py-2 rounded-lg border font-semibold" onClick={onDone} type="button">
                Hecho
              </button>
              <button className="px-4 py-2 rounded-lg border font-semibold" onClick={onCancel} type="button">
                Cancelar
              </button>
              <button className="px-4 py-2 rounded-lg border font-semibold text-red-700" onClick={onDelete} type="button">
                Eliminar
              </button>
            </>
          ) : (
            <div className="text-sm opacity-70">Este es un <b>plazo</b> (automático). Aquí solo se visualiza.</div>
          )}

          <button className="ml-auto px-4 py-2 rounded-lg bg-white border" onClick={onClose} type="button">
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

export function DayModal({ open, onClose, date, events, tz, onOpenEvent, onNewEvent, onGoDayView }) {
  if (!open) return null;

  const onBackdrop = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  const title = date
    ? new Intl.DateTimeFormat("es-PE", {
        timeZone: tz,
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "2-digit",
      }).format(date)
    : "Eventos del día";

  return (
    <div className="fixed inset-0 z-[9999] bg-black/50 flex items-center justify-center p-4" onMouseDown={onBackdrop}>
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden">
        <div className="p-4 border-b flex items-center gap-3">
          <div className="min-w-0">
            <div className="text-xs opacity-70">Agenda · Día</div>
            <div className="text-lg font-bold text-[#5C2E0B] truncate">{title}</div>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <button className="px-3 py-2 rounded-lg border font-semibold hover:bg-gray-50" onClick={onGoDayView} type="button">
              Ver Día
            </button>
            <button className="px-3 py-2 rounded-lg bg-[#5C2E0B] text-white font-semibold" onClick={onNewEvent} type="button">
              + Nuevo
            </button>
            <button className="px-3 py-2 rounded-lg border" onClick={onClose} type="button">
              Cerrar
            </button>
          </div>
        </div>

        <div className="p-3 max-h-[60vh] overflow-auto">
          {!events?.length ? (
            <div className="p-6 text-sm text-gray-600">No hay eventos este día.</div>
          ) : (
            <div className="space-y-2">
              {events.map((ev) => {
                const raw = ev?.resource?.raw || {};
                const type = ev?.resource?.type || "unknown";
                const hhmm = raw?.startISO ? formatTimeHHmm(raw.startISO) : "";

                return (
                  <button
                    key={ev.id}
                    type="button"
                    onClick={() => onOpenEvent?.(ev)}
                    className="w-full text-left p-3 rounded-xl border hover:bg-gray-50 flex items-start gap-3"
                  >
                    <div className="w-14 shrink-0 text-sm font-bold text-[#5C2E0B]">
                      {hhmm || (type === "plazo" ? "PL" : "EV")}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold truncate">{ev.title}</div>
                      <div className="text-[11px] opacity-70 truncate">
                        {type === "plazo" ? "Automático (plazo)" : "Manual"}
                      </div>
                    </div>

                    <div className="text-xs opacity-60 shrink-0">{type === "plazo" ? "⏳" : "📌"}</div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function EventModal({ open, onClose, onSave, editing, form, setForm, formError }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md p-4 rounded-xl shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-bold mb-2 text-[#5C2E0B]">{editing ? "Editar evento" : "Nuevo evento"}</h3>
          <button className="text-sm underline opacity-70" onClick={onClose} type="button">
            cerrar
          </button>
        </div>

        {formError ? (
          <div className="mb-2 text-xs text-red-700 bg-red-50 border border-red-200 rounded p-2">{formError}</div>
        ) : null}

        <input
          className="border p-2 w-full mb-2 rounded"
          placeholder="Título"
          value={form.title}
          onChange={(e) => setForm((s) => ({ ...s, title: e.target.value }))}
        />

        <div className="grid grid-cols-2 gap-2 mb-2">
          <input
            inputMode="numeric"
            className="border p-2 w-full rounded"
            placeholder="DD/MM/AAAA"
            value={form.dateText}
            onChange={(e) => setForm((s) => ({ ...s, dateText: maskDDMMYYYY(e.target.value) }))}
          />
          <input
            inputMode="numeric"
            className="border p-2 w-full rounded"
            placeholder="HH:mm"
            value={form.timeText}
            onChange={(e) => setForm((s) => ({ ...s, timeText: maskHHMM(e.target.value) }))}
          />
        </div>

        <textarea
          className="border p-2 w-full mb-2 rounded min-h-[90px]"
          placeholder="Notas / descripción"
          value={form.notes}
          onChange={(e) => setForm((s) => ({ ...s, notes: e.target.value }))}
        />

        <div className="border rounded p-3 mb-3">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.alertaWhatsapp}
              onChange={(e) =>
                setForm((s) => ({
                  ...s,
                  alertaWhatsapp: e.target.checked,
                  telefono: e.target.checked ? s.telefono : "",
                }))
              }
            />
            <span className="font-semibold">Alerta WhatsApp</span>
          </label>

          {form.alertaWhatsapp && (
            <div className="mt-2">
              <input
                className="border p-2 w-full rounded"
                placeholder="Ej: +51922038280 (E.164)"
                value={form.telefono}
                onChange={(e) => setForm((s) => ({ ...s, telefono: e.target.value }))}
              />
              <p className="text-xs opacity-70 mt-1">
                Formato internacional <b>E.164</b> (con <b>+</b>).
              </p>
            </div>
          )}
        </div>

        <button className="bg-[#5C2E0B] text-white w-full py-2 rounded-lg font-semibold" onClick={onSave} type="button">
          Guardar
        </button>

        <button className="mt-2 w-full py-2 rounded-lg border" onClick={onClose} type="button">
          Cerrar
        </button>
      </div>
    </div>
  );
}
