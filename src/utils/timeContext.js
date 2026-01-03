// src/utils/timeContext.js
// Fuente única de fecha, hora y zona del usuario (frontend manda)

export function getTimeContext() {
  const now = new Date();

  return {
    userTimeISO: now.toISOString(), // tiempo absoluto (backend-friendly)
    userTimeZone: Intl.DateTimeFormat().resolvedOptions().timeZone, // ej: America/Lima
    userLocale: navigator.language || "es-PE",
    userTimestamp: now.getTime(), // útil para plazos
  };
}
