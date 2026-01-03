import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import timezone from "dayjs/plugin/timezone.js";

dayjs.extend(utc);
dayjs.extend(timezone);

/**
 * Normaliza feriados:
 * - array de strings "YYYY-MM-DD"
 */
function normalizeHolidays(holidays = []) {
  const set = new Set();
  for (const h of holidays) {
    const s = String(h || "").trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) set.add(s);
  }
  return set;
}

function isWeekend(d) {
  // dayjs(): 0=domingo, 6=sábado
  const wd = d.day();
  return wd === 0 || wd === 6;
}

function isHoliday(d, holidaysSet) {
  const key = d.format("YYYY-MM-DD");
  return holidaysSet.has(key);
}

function isBusinessDay(d, holidaysSet) {
  return !isWeekend(d) && !isHoliday(d, holidaysSet);
}

/**
 * Ajusta al siguiente día hábil si cae en inhábil.
 */
function rollToBusinessDay(d, holidaysSet) {
  let cur = d;
  while (!isBusinessDay(cur, holidaysSet)) {
    cur = cur.add(1, "day");
  }
  return cur;
}

/**
 * Suma días calendario.
 */
function addCalendarDays(start, days) {
  return start.add(days, "day");
}

/**
 * Suma días hábiles (excluye sáb/dom y feriados).
 * Regla: empieza a contar desde el día siguiente (estándar práctico).
 * - start: dayjs (fecha/hora de inicio)
 * - businessDays: entero >= 0
 */
function addBusinessDays(start, businessDays, holidaysSet) {
  let cur = start;
  let remaining = Math.max(0, Number(businessDays) | 0);

  while (remaining > 0) {
    cur = cur.add(1, "day");
    if (isBusinessDay(cur, holidaysSet)) remaining--;
  }
  return cur;
}

/**
 * Calcula vencimiento:
 * - tipo: "habiles" | "calendario"
 * - ajusteInhabil: si true, si cae en inhábil lo corre al siguiente hábil
 */
export function calcularPlazo({
  startISO,          // opcional: ISO string
  startUnix,         // opcional: seconds unix
  tz = "America/Lima",
  cantidad = 0,
  tipo = "habiles",
  holidays = [],
  ajusteInhabil = true,
}) {
  const holidaysSet = normalizeHolidays(holidays);

  let start = null;
  if (startUnix != null && String(startUnix).trim() !== "") {
    // unix en segundos
    start = dayjs.unix(Number(startUnix)).tz(tz);
  } else if (startISO) {
    start = dayjs(startISO).tz(tz);
  } else {
    start = dayjs().tz(tz); // fallback
  }

  const n = Math.max(0, Number(cantidad) | 0);

  let end =
    tipo === "calendario"
      ? addCalendarDays(start, n)
      : addBusinessDays(start, n, holidaysSet);

  if (ajusteInhabil) {
    end = rollToBusinessDay(end, holidaysSet);
  }

  return {
    tz,
    input: {
      startISO: start.toISOString(),
      startUnix: start.unix(),
      tipo,
      cantidad: n,
      ajusteInhabil: !!ajusteInhabil,
      holidaysCount: holidaysSet.size,
    },
    result: {
      endISO: end.toISOString(),
      endUnix: end.unix(),
      endLocal: end.format("DD/MM/YYYY HH:mm:ss [PET]"),
      endDate: end.format("YYYY-MM-DD"),
      businessDay: isBusinessDay(end, holidaysSet),
      rolled: !!ajusteInhabil && !isBusinessDay(end, holidaysSet) ? true : false,
    },
  };
}
