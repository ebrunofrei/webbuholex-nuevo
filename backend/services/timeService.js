// backend/services/timeService.js

function safeTimeZone(tz) {
  const raw = String(tz || "").trim();
  if (!raw) return null;

  // Node 20+ suele soportar esto. Si falla, usamos try/catch.
  try {
    if (typeof Intl?.supportedValuesOf === "function") {
      const set = new Set(Intl.supportedValuesOf("timeZone"));
      return set.has(raw) ? raw : null;
    }
  } catch (_) {}

  // Fallback: validación por intento de formateo
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: raw }).format(new Date());
    return raw;
  } catch (_) {
    return null;
  }
}

function formatInTimeZone(date, timeZone, locale = "es-PE") {
  // “local” legible para UI + logs
  const parts = new Intl.DateTimeFormat(locale, {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZoneName: "short",
  }).formatToParts(date);

  const m = Object.fromEntries(parts.map(p => [p.type, p.value]));
  // dd/mm/yyyy, HH:MM:SS GMT-5 (depende del tz)
  return `${m.day}/${m.month}/${m.year} ${m.hour}:${m.minute}:${m.second} ${m.timeZoneName}`;
}

export function getNowPayload({ tz, locale } = {}) {
  const date = new Date();
  const unix = Date.now();
  const iso = date.toISOString();

  const timeZone = safeTimeZone(tz) || "America/Lima";
  const local = formatInTimeZone(date, timeZone, locale || "es-PE");

  return { unix, iso, tz: timeZone, local };
}
