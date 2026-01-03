// src/shared/services/timeService.js
export async function getNow({ tz, signal } = {}) {
  // Backend debe ser el "source of truth" para plazos
  // Si aún no tienes endpoint, igual lo dejamos listo.
  const q = tz ? `?tz=${encodeURIComponent(tz)}` : "";
  const res = await fetch(`/api/time/now${q}`, { signal });

  if (!res.ok) {
    throw new Error("No se pudo obtener hora del servidor");
  }

  return res.json(); // esperado: { iso, tz, local, unix }
}
