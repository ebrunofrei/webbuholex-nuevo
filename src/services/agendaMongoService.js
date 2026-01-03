// ============================================================
// 🦉 BÚHOLEX — Agenda Mongo Service (Enterprise v3.2)
// ------------------------------------------------------------
// - AbortController para requests colgados
// - Timeout seguro configurable
// - Retries opcionales (para producción)
// - Respuesta normalizada
// - Sin dependencias externas
// ============================================================

function getBaseURL() {
  return (import.meta?.env?.VITE_API_URL || "").replace(/\/$/, "");
}

function authHeaders(token) {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function safeJson(res) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

// ------------------------------------------------------------
// Utilidad: timeout con abort
// ------------------------------------------------------------
function fetchWithTimeout(url, options = {}, timeoutMs = 12000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  return fetch(url, {
    ...options,
    signal: controller.signal,
  }).finally(() => {
    clearTimeout(timer);
  });
}

// ------------------------------------------------------------
// CORE: llamada robusta a la API
// ------------------------------------------------------------
async function callApi(url, { token, timeoutMs = 12000, retries = 0 } = {}) {
  let attempt = 0;
  let lastErr = null;

  while (attempt <= retries) {
    try {
      const res = await fetchWithTimeout(
        url,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            ...authHeaders(token),
          },
          cache: "no-store",
        },
        timeoutMs
      );

      const data = await safeJson(res);

      if (!res.ok || !data?.ok) {
        throw new Error(data?.detail || "Error en API");
      }

      return {
        items: data.items || [],
        counts: data.counts || null,
        meta: data.meta || null,
      };
    } catch (err) {
      lastErr = err;

      // Si falló por abort/timeout y aún hay retries disponibles → intenta de nuevo
      if (attempt < retries) {
        await new Promise((res) => setTimeout(res, 300 + attempt * 300));
        attempt++;
        continue;
      }

      break;
    }
  }

  throw lastErr;
}

// ============================================================
// API PÚBLICA
// ============================================================

// Obtiene plazos+eventos del rango visible
export async function fetchAgendaMongoRango({
  usuarioId,
  from, // YYYY-MM-DD
  to,   // YYYY-MM-DD
  tz = "America/Lima",
  token = null,
  timeoutMs = 12000,
  retries = 0,
} = {}) {
  if (!usuarioId) throw new Error("fetchAgendaMongoRango: usuarioId es requerido");
  if (!from || !to) throw new Error("fetchAgendaMongoRango: from/to son requeridos");

  const base = getBaseURL();
  const qs = new URLSearchParams({ usuarioId, from, to, tz });
  const url = `${base}/api/agenda/rango?${qs.toString()}`;

  const { items } = await callApi(url, { token, timeoutMs, retries });
  return items;
}

// Obtiene solo los eventos/plazos que vencen HOY
export async function fetchAgendaMongoHoy({
  usuarioId,
  tz = "America/Lima",
  token = null,
  timeoutMs = 12000,
  retries = 0,
} = {}) {
  if (!usuarioId) throw new Error("fetchAgendaMongoHoy: usuarioId es requerido");

  const base = getBaseURL();
  const qs = new URLSearchParams({ usuarioId, tz });
  const url = `${base}/api/agenda/hoy?${qs.toString()}`;

  const { items } = await callApi(url, { token, timeoutMs, retries });
  return items;
}
