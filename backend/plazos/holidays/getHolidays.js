// backend/plazos/holidays/getHolidays.js
import { PE_HOLIDAYS_2025 } from "../data/holidays/pe/pe.holidays.2025.js";

const mem = new Map(); // key: `${country}:${year}`

function normalize(list) {
  return Array.from(new Set((list || []).filter(Boolean))).sort();
}

export async function getHolidays({ country = "PE", year }) {
  const y = Number(year || new Date().getUTCFullYear());
  const key = `${country}:${y}`;
  if (mem.has(key)) return mem.get(key);

  let holidays = [];

  // 🔥 Por ahora: Perú 2025 como demo. Luego lo escalas por año/país.
  if (country === "PE" && y === 2025) holidays = PE_HOLIDAYS_2025;

  // Si no hay data, devuelve vacío, pero NO revientes el motor.
  const out = normalize(holidays);
  mem.set(key, out);
  return out;
}
