// backend/plazos/core/calcularPlazo.js
// Core puro: calcula fecha fin con feriados + fin de semana (workweek)

function toDateFromInput({ startISO, startUnix }) {
  if (startISO) {
    const d = new Date(startISO);
    if (Number.isNaN(d.getTime())) throw new Error("startISO inválido");
    return d;
  }
  if (startUnix != null) {
    const ms = Number(startUnix) * 1000;
    const d = new Date(ms);
    if (Number.isNaN(d.getTime())) throw new Error("startUnix inválido");
    return d;
  }
  return new Date();
}

function addDays(dt, n) {
  const x = new Date(dt);
  x.setDate(x.getDate() + n);
  return x;
}

function ymd(date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function isWeekendByWorkweek(date, workweek = "mon-fri") {
  // JS: 0=domingo ... 6=sábado
  const day = date.getDay();

  if (workweek === "mon-sat") return day === 0;         // inhábil: domingo
  if (workweek === "sun-thu") return day === 5 || day === 6; // inhábil: viernes/sábado (ejemplo)
  // default mon-fri => inhábil sábado y domingo
  return day === 0 || day === 6;
}

/**
 * calcularPlazo({
 *  startISO, startUnix, tz,
 *  cantidad, tipo,
 *  holidays: ["YYYY-MM-DD", ...],
 *  rules: { startRule, carryIfInhabil, workweek }
 * })
 */
export function calcularPlazo(input = {}) {
  const {
    startISO,
    startUnix,
    cantidad = 0,
    tipo = "habiles",
    holidays = [],
    rules = {},
  } = input;

  const n = Number(cantidad || 0);
  if (!Number.isFinite(n) || n < 0) throw new Error("cantidad inválida");

  const start = toDateFromInput({ startISO, startUnix });

  const finalTipo = String(tipo || "habiles").toLowerCase();

  // reglas
  const startRule = rules.startRule || "next_day"; // "same_day" | "next_day"
  const carryIfInhabil = rules.carryIfInhabil !== false; // default true
  const workweek = rules.workweek || "mon-fri";

  const holidaysSet = new Set((holidays || []).filter(Boolean));

  const isInhabil = (d) => {
    if (isWeekendByWorkweek(d, workweek)) return true;
    if (holidaysSet.has(ymd(d))) return true;
    return false;
  };

  let cursor = new Date(start);
  if (startRule === "next_day") cursor = addDays(cursor, 1);

  let end = new Date(cursor);

  if (finalTipo === "calendario") {
    end = addDays(cursor, n);
  } else {
    let remaining = n;
    while (remaining > 0) {
      if (!isInhabil(end)) remaining -= 1;
      if (remaining > 0) end = addDays(end, 1);
    }
  }

  if (carryIfInhabil) {
    while (isInhabil(end)) end = addDays(end, 1);
  }

  return {
    startISO: start.toISOString(),
    endISO: end.toISOString(),
    endUnix: Math.floor(end.getTime() / 1000),
    meta: { startRule, carryIfInhabil, workweek, holidaysCount: holidaysSet.size },
  };
}
