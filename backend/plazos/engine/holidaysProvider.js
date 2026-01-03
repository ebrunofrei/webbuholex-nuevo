// backend/plazos/engine/holidaysProvider.js
import { getHolidays } from "../holidays/getHolidays.js"; // <-- ojo: ruta correcta (según tu árbol)

const cache = new Map(); // key: `${country}:${year}:${mode}`

export async function getHolidaysSet({ country = "PE", year, mode = "country" } = {}) {
  const y = Number(year || new Date().getUTCFullYear());
  const key = `${country}:${y}:${mode}`;
  if (cache.has(key)) return cache.get(key);

  // Por ahora "mode" queda reservado, pero ya queda listo para:
  // country / regional / judicial / custom, etc.
  const list = await getHolidays({ country, year: y });
  const set = new Set(Array.isArray(list) ? list : []);

  cache.set(key, set);
  return set;
}

/**
 * workweek soporta:
 * - "mon-fri" (default)
 * - ["mon","tue","wed","thu","fri"]
 */
export function isWeekend(date, workweek = "mon-fri") {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return true;

  const map = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
  const day = map[d.getDay()];

  let allowed = null;

  if (Array.isArray(workweek)) {
    allowed = new Set(workweek.map(x => String(x).toLowerCase()));
  } else {
    const ww = String(workweek || "mon-fri").toLowerCase().trim();
    if (ww === "mon-fri") allowed = new Set(["mon","tue","wed","thu","fri"]);
    else if (ww === "mon-sat") allowed = new Set(["mon","tue","wed","thu","fri","sat"]);
    else if (ww === "sun-sat") allowed = new Set(["sun","mon","tue","wed","thu","fri","sat"]);
    else allowed = new Set(["mon","tue","wed","thu","fri"]); // fallback
  }

  return !allowed.has(day);
}
