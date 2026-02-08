// ============================================================
// 🗓️ Agenda Service (BúhoLex)
// ------------------------------------------------------------
// CANONICAL ENTERPRISE CLIENT — AGENDA LIBRE
//
// PRINCIPIOS:
// - Agenda LIBRE (solo usuarioId)
// - SIN sessionId / caseId
// - Contrato alineado con backend / Mongo
// - Este servicio NO interpreta negocio
// ============================================================

const DEFAULT_TIMEOUT = 12000;
const DEFAULT_TZ = "America/Lima";

/* ============================================================
 * BASE
 * ========================================================== */

function getBaseURL() {
  return String(import.meta?.env?.VITE_API_URL || "").replace(/\/$/, "");
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

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/* ============================================================
 * VALIDACIONES
 * ========================================================== */

function requireUsuarioId(usuarioId) {
  if (!usuarioId) {
    throw new Error("agendaService: usuarioId es requerido");
  }
}

/* ============================================================
 * URL BUILDER
 * ========================================================== */

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

/* ============================================================
 * CORE REQUEST
 * ========================================================== */

async function requestJSON(
  url,
  {
    method = "GET",
    token = null,
    body = null,
    timeoutMs = DEFAULT_TIMEOUT,
    retries = 0,
    signal = null,
  } = {}
) {
  let attempt = 0;
  let lastErr = null;

  while (attempt <= retries) {
    attempt += 1;

    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);

    const onAbort = () => {
      try { ctrl.abort(); } catch {}
    };
    if (signal) signal.addEventListener("abort", onAbort, { once: true });
console.log("🚀 FETCH A:", url);
console.log("📤 BODY FINAL:", body);

    try {
      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          ...authHeaders(token),
        },
        body: body ? JSON.stringify(body) : undefined,
        cache: "no-store",
        signal: ctrl.signal,
      });

      const data = await safeJson(res);

      if (!res.ok) {
        throw new Error(
          data?.detail ||
          data?.error ||
          `HTTP ${res.status} ${method} ${url}`
        );
      }

      return data ?? {};
    } catch (e) {
      lastErr = e;
      const aborted = String(e?.message || "").toLowerCase().includes("abort");
      if (aborted || attempt > retries) throw e;
      await sleep(300 * attempt);
    } finally {
      clearTimeout(timer);
      if (signal) signal.removeEventListener("abort", onAbort);
    }
  }

  throw lastErr || new Error("agendaService: fallo desconocido");
}

/* ============================================================
 * ➕ CREAR EVENTO (CANÓNICO)
 * ========================================================== */

export async function createAgendaEvento({
  usuarioId,
  tz = DEFAULT_TZ,
  title,
  startISO,
  endISO,
  dueLocalDay,
  notes = "",
  description = "",
  telefono = "",
  alertaWhatsapp = false,
  token = null,
  timeoutMs = DEFAULT_TIMEOUT,
  retries = 1,
  signal = null,
} = {}) {
  requireUsuarioId(usuarioId);

  if (!title || !startISO) {
    throw new Error("createAgendaEvento: title/startISO requeridos");
  }

  const startDate = new Date(startISO);
  const endDate = new Date(endISO || startISO);

  const url = buildURL("/api/agenda-eventos");

  const body = {
    usuarioId,
    tz,

    title: String(title).trim(),

    startISO,
    endISO: endISO || startISO,

    startUnix: Math.floor(startDate.getTime() / 1000),
    endUnix: Math.floor(endDate.getTime() / 1000),

    dueLocalDay,

    notes: String(notes || description || ""),
    description: String(notes || description || ""),

    telefono: String(telefono || "").trim(),
    alertaWhatsapp: !!alertaWhatsapp,

    status: "active",
  };
  console.log("🔥 LLEGO AL SERVICE createAgendaEvento:", body);


  const res = await requestJSON(url, {
    method: "POST",
    token,
    timeoutMs,
    retries,
    signal,
    body,
  });

  return res.item || null;
}

/* ============================================================
 * 📆 AGENDA — RANGO
 * ========================================================== */

export async function fetchAgendaMongoRango({
  usuarioId,
  from,
  to,
  tz = DEFAULT_TZ,
  token = null,
  timeoutMs = DEFAULT_TIMEOUT,
  retries = 1,
  signal = null,
} = {}) {
  requireUsuarioId(usuarioId);
  if (!from || !to) {
    throw new Error("fetchAgendaMongoRango: from/to requeridos");
  }

  const url = buildURL("/api/agenda-eventos/rango", {
    usuarioId,
    from,
    to,
    tz,
  });

  const res = await requestJSON(url, {
    method: "GET",
    token,
    timeoutMs,
    retries,
    signal,
  });

  return res.items || [];
}

/* ============================================================
 * 📅 AGENDA — HOY
 * ========================================================== */

export async function fetchAgendaHoy({
  usuarioId,
  tz = DEFAULT_TZ,
  token = null,
  timeoutMs = DEFAULT_TIMEOUT,
  retries = 1,
  signal = null,
} = {}) {
  requireUsuarioId(usuarioId);

  const url = buildURL("/api/agenda-eventos/hoy", {
    usuarioId,
    tz,
  });

  const res = await requestJSON(url, {
    method: "GET",
    token,
    timeoutMs,
    retries,
    signal,
  });

  return res.items || [];
}

/* ============================================================
 * 🚨 AGENDA — ALERTAS / PRÓXIMOS
 * ========================================================== */

export async function fetchAgendaAlertas({
  usuarioId,
  token = null,
  timeoutMs = DEFAULT_TIMEOUT,
  retries = 1,
  signal = null,
} = {}) {
  requireUsuarioId(usuarioId);

  const url = buildURL("/api/agenda/alerts/alertas", { usuarioId });

  const res = await requestJSON(url, {
    method: "GET",
    token,
    timeoutMs,
    retries,
    signal,
  });

  return res.alerts || [];
}


/* ============================================================
 * 🔔 RECORDATORIOS
 * ========================================================== */

export async function setAgendaReminder({
  eventId,
  minutesBefore = 120,
  channel = "whatsapp",
  token = null,
  timeoutMs = DEFAULT_TIMEOUT,
  retries = 1,
  signal = null,
} = {}) {
  if (!eventId) {
    throw new Error("setAgendaReminder: eventId requerido");
  }

  const url = buildURL("/api/agenda-eventos/reminder");

  const res = await requestJSON(url, {
    method: "POST",
    token,
    body: { eventId, minutesBefore, channel },
    timeoutMs,
    retries,
    signal,
  });

  return res.item || null;
}
