// src/services/agendaService.js
// ============================================================
// Agenda Service (BúhoLex) – API client (Mongo)
// - timeout + retries + abort signal
// - errores claros
// ============================================================

const DEFAULT_TIMEOUT = 12000;

function getBaseURL() {
  return String(import.meta?.env?.VITE_API_URL || "").replace(/\/$/, "");
}

function authHeaders(token) {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function safeJson(res) {
  try { return await res.json(); } catch { return null; }
}

function buildURL(pathname, params = {}) {
  const base = getBaseURL();
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null || v === "") return;
    qs.set(k, String(v));
  });
  const q = qs.toString();
  return `${base}${pathname}${q ? `?${q}` : ""}`;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function requestJSON(
  url,
  { method = "GET", token = null, body = null, timeoutMs = DEFAULT_TIMEOUT, retries = 1, signal = null } = {}
) {
  let attempt = 0;
  let lastErr = null;

  while (attempt <= retries) {
    attempt += 1;

    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);

    const onAbort = () => { try { ctrl.abort(); } catch {} };
    if (signal) signal.addEventListener("abort", onAbort, { once: true });

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", ...authHeaders(token) },
        body: body ? JSON.stringify(body) : undefined,
        cache: "no-store",
        signal: ctrl.signal,
      });

      const data = await safeJson(res);

      if (!res.ok || !data?.ok) {
        const msg =
          data?.detail ||
          data?.error ||
          `Error HTTP ${res.status} en ${method} ${url}`;
        throw new Error(msg);
      }

      return data;
    } catch (e) {
      lastErr = e;

      const msg = String(e?.message || e).toLowerCase();
      const aborted = msg.includes("aborted") || msg.includes("abort");

      // Si ya abortó (o usuario cambió de ruta), no reintentar
      if (aborted || attempt > retries) throw e;

      // backoff suave
      await sleep(350 * attempt);
    } finally {
      clearTimeout(timer);
      if (signal) signal.removeEventListener("abort", onAbort);
    }
  }

  throw lastErr || new Error("requestJSON: fallo desconocido");
}

// ============================================================
// GET /api/agenda/alertas
// ============================================================
export async function fetchAgendaAlertas({
  usuarioId,
  tz = "America/Lima",
  horizonMinutes = 1440,
  includeUpcoming = true,
  limit = 50,
  token = null,
  timeoutMs = DEFAULT_TIMEOUT,
  retries = 1,
  signal = null,
} = {}) {
  if (!usuarioId) throw new Error("fetchAgendaAlertas: usuarioId es requerido");

  const url = buildURL("/api/agenda/alertas", {
    usuarioId,
    tz,
    horizonMinutes,
    includeUpcoming: includeUpcoming ? "true" : "false",
    limit,
  });

  return requestJSON(url, { method: "GET", token, timeoutMs, retries, signal });
}

// ============================================================
// GET /api/agenda/hoy
// ============================================================
export async function fetchAgendaHoy({
  usuarioId,
  tz = "America/Lima",
  token = null,
  timeoutMs = DEFAULT_TIMEOUT,
  retries = 1,
  signal = null,
} = {}) {
  if (!usuarioId) throw new Error("fetchAgendaHoy: usuarioId es requerido");

  const url = buildURL("/api/agenda/hoy", { usuarioId, tz });
  return requestJSON(url, { method: "GET", token, timeoutMs, retries, signal });
}

// ============================================================
// PUT /api/agenda/:id/status  (DeadlineEvent)
// ============================================================
export async function updateDeadlineEventStatus({
  id,
  status,
  token = null,
  timeoutMs = DEFAULT_TIMEOUT,
  retries = 1,
  signal = null,
} = {}) {
  if (!id) throw new Error("updateDeadlineEventStatus: id requerido");
  if (!status) throw new Error("updateDeadlineEventStatus: status requerido");

  const url = buildURL(`/api/agenda/${id}/status`);
  return requestJSON(url, { method: "PUT", token, body: { status }, timeoutMs, retries, signal });
}
