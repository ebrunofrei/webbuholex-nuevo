import addDays from "date-fns/addDays";
import startOfMonth from "date-fns/startOfMonth";
import endOfMonth from "date-fns/endOfMonth";

// =========================
// Fechas / TZ
// =========================
export function safeDate(d) {
  if (d instanceof Date) return Number.isNaN(d.getTime()) ? new Date() : d;

  if (typeof d === "string") {
    const x = new Date(d);
    if (!Number.isNaN(x.getTime())) return x;

    const m = d.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/);
    if (m) {
      const [_, yy, mm, dd, hh, mi] = m;
      const z = new Date(Number(yy), Number(mm) - 1, Number(dd), Number(hh), Number(mi), 0);
      return Number.isNaN(z.getTime()) ? new Date() : z;
    }
  }

  const x = new Date(d);
  return Number.isNaN(x.getTime()) ? new Date() : x;
}

export function toYMD(dateLike, tz = "America/Lima") {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(safeDate(dateLike));
}

export function formatTimeHHmm(dateLike, locale = "es-PE") {
  const d = safeDate(dateLike);
  return d.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
}

// dateISO YYYY-MM-DD + time HH:mm -> Date local
export function parseDateTimeLocal(dateISO, timeHHMM) {
  if (!dateISO || !timeHHMM) return null;

  const m1 = String(dateISO).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const m2 = String(timeHHMM).match(/^(\d{2}):(\d{2})$/);
  if (!m1 || !m2) return null;

  const y = Number(m1[1]);
  const mo = Number(m1[2]) - 1;
  const da = Number(m1[3]);
  const hh = Number(m2[1]);
  const mi = Number(m2[2]);

  const dt = new Date(y, mo, da, hh, mi, 0);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

// =========================
// Rangos RBC
// =========================
export function normalizeRange(rangeInfo, view = "month", tz = "America/Lima", fallbackDate = new Date()) {
  const base = safeDate(fallbackDate);

  if (rangeInfo instanceof Date) {
    const d = rangeInfo;

    if (view === "day") {
      const ymd = toYMD(d, tz);
      return { from: ymd, to: ymd };
    }

    if (view === "agenda") {
      return { from: toYMD(d, tz), to: toYMD(addDays(d, 30), tz) };
    }

    return { from: toYMD(startOfMonth(d), tz), to: toYMD(endOfMonth(d), tz) };
  }

  if (Array.isArray(rangeInfo) && rangeInfo.length) {
    const first = rangeInfo[0];
    const last = rangeInfo[rangeInfo.length - 1];
    return { from: toYMD(first, tz), to: toYMD(last, tz) };
  }

  if (rangeInfo?.start && rangeInfo?.end) {
    return { from: toYMD(rangeInfo.start, tz), to: toYMD(rangeInfo.end, tz) };
  }

  if (rangeInfo?.value?.start && rangeInfo?.value?.end) {
    return { from: toYMD(rangeInfo.value.start, tz), to: toYMD(rangeInfo.value.end, tz) };
  }

  if (view === "agenda") {
    return { from: toYMD(base, tz), to: toYMD(addDays(base, 30), tz) };
  }

  return { from: toYMD(startOfMonth(base), tz), to: toYMD(endOfMonth(base), tz) };
}

// =========================
// Masks / Validación
// =========================
export function onlyDigits(s) {
  return String(s || "").replace(/\D/g, "");
}

export function maskDDMMYYYY(value) {
  const d = onlyDigits(value).slice(0, 8);
  const a = d.slice(0, 2);
  const b = d.slice(2, 4);
  const c = d.slice(4, 8);
  if (d.length <= 2) return a;
  if (d.length <= 4) return `${a}/${b}`;
  return `${a}/${b}/${c}`;
}

export function maskHHMM(value) {
  const d = onlyDigits(value).slice(0, 4);
  const a = d.slice(0, 2);
  const b = d.slice(2, 4);
  if (d.length <= 2) return a;
  return `${a}:${b}`;
}

export function ddmmyyyyToISO(ddmmyyyy) {
  const m = String(ddmmyyyy || "").match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return "";
  const dd = m[1],
    mm = m[2],
    yyyy = m[3];
  return `${yyyy}-${mm}-${dd}`;
}

export function normalizeHHMM(hhmm) {
  const m = String(hhmm || "").match(/^(\d{2}):(\d{2})$/);
  if (!m) return "";
  return `${m[1]}:${m[2]}`;
}

export function isValidISODate(iso) {
  return /^\d{4}-\d{2}-\d{2}$/.test(iso);
}

export function isValidTime(t) {
  if (!/^\d{2}:\d{2}$/.test(t)) return false;
  const [h, m] = t.split(":").map(Number);
  return h >= 0 && h <= 23 && m >= 0 && m <= 59;
}

// =========================
// Convertidores RBC
// =========================
export function plazoToCalendarEvent(ev) {
  const end = ev.endISO ? safeDate(ev.endISO) : safeDate((ev.endUnix || 0) * 1000);
  const endUnix = ev.endUnix || Math.floor(end.getTime() / 1000);

  return {
    id: `plazo:${ev._id}`,
    title: `⏳ ${ev.title}`,
    start: end,
    end,
    allDay: true,
    resource: { type: "plazo", raw: { ...ev, endUnix } },
  };
}

export function manualToCalendarEvent(ev) {
  const start = ev.startISO ? safeDate(ev.startISO) : safeDate(ev.dueLocalDay);
  const end = ev.endISO ? safeDate(ev.endISO) : start;

  return {
    id: `manual:${ev._id}`,
    title: `📌 ${ev.title}`,
    start,
    end,
    allDay: true,
    resource: {
      type: "manual",
      raw: {
        ...ev,
        startISO: ev.startISO || start.toISOString(),
        endISO: ev.endISO || end.toISOString(),
        startUnix: ev.startUnix || Math.floor(start.getTime() / 1000),
        endUnix: ev.endUnix || Math.floor(end.getTime() / 1000),
      },
    },
  };
}
