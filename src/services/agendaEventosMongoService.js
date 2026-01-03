// ============================================================
// 🦉 BÚHOLEX — Agenda Eventos (Manuales) Service – Enterprise v3.4
// ------------------------------------------------------------
// FIX PRO:
// ✅ BaseURL fallback a mismo origin (Vite proxy / same domain)
// ✅ Timeout con AbortController ENCADENADO (sin doble controller)
// ✅ Retries deterministas (sin loop raro)
// ✅ Abort detection robusto (name === 'AbortError')
// ✅ Content-Type solo cuando hay body
// ✅ notes/description normalizados
// ✅ delete soporta tz opcional
// ============================================================

const DEFAULT_TZ = "America/Lima";

function getBaseURL() {
  const raw = (import.meta?.env?.VITE_API_URL || "").trim();
  return raw ? raw.replace(/\/$/, "") : "";
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

function fetchWithTimeout(url, options = {}, timeoutMs = 12000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  // Encadena abort externo -> controller interno
  const ext = options.signal;
  if (ext) {
    if (ext.aborted) controller.abort();
    else ext.addEventListener("abort", () => controller.abort(), { once: true });
  }

  return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(timer));
}

function normalizeNotesDescription({ notes = "", description = "" } = {}) {
  const n = String(notes || "").trim();
  const d = String(description || "").trim();
  const unified = n || d;
  return { notes: unified, description: unified };
}

function isAbortError(e) {
  return e?.name === "AbortError" || String(e?.message || "").toLowerCase().includes("abort");
}

async function callApi(
  url,
  { method = "GET", token = null, body = null, timeoutMs = 12000, retries = 1, signal = null } = {}
) {
  let attempt = 0;
  let lastErr = null;

  while (attempt <= retries) {
    try {
      const headers = {
        ...authHeaders(token),
        ...(body ? { "Content-Type": "application/json" } : {}),
      };

      const res = await fetchWithTimeout(
        url,
        {
          method,
          headers,
          body: body ? JSON.stringify(body) : undefined,
          cache: "no-store",
          signal,
        },
        timeoutMs
      );

      const data = await safeJson(res);

      // HTTP error o payload ok=false
      if (!res.ok || data?.ok === false) {
        throw new Error(data?.detail || data?.error || `Error ${res.status}`);
      }

      // backend sin ok pero con item/items -> OK
      if (data?.ok !== true && !data?.item && !data?.items) {
        throw new Error("Respuesta inesperada del servidor");
      }

      return data;
    } catch (e) {
      lastErr = e;
      attempt++;

      if (isAbortError(e)) throw e;
      if (attempt > retries) throw e;

      await new Promise((r) => setTimeout(r, 350 + (attempt - 1) * 300));
    }
  }

  throw lastErr;
}

// ============================================================
// GET /api/agenda-eventos/rango
// ============================================================
export async function fetchAgendaEventosRango({
  usuarioId,
  from,
  to,
  tz = DEFAULT_TZ,
  token = null,
  timeoutMs = 12000,
  retries = 1,
  signal = null,
} = {}) {
  if (!usuarioId) throw new Error("usuarioId requerido");
  if (!from || !to) throw new Error("from/to requeridos");

  const base = getBaseURL();
  const qs = new URLSearchParams({ usuarioId, from, to, tz });
  const url = `${base}/api/agenda-eventos/rango?${qs.toString()}`;

  const data = await callApi(url, { method: "GET", token, timeoutMs, retries, signal });
  return data.items || [];
}

// ============================================================
// POST /api/agenda-eventos  (crear)
// ============================================================
export async function createAgendaEvento({
  usuarioId,
  tz = DEFAULT_TZ,
  title,
  startISO,
  endISO,
  dueLocalDay = null,
  notes = "",
  description = "",
  telefono = "",
  alertaWhatsapp = false,
  token = null,
  timeoutMs = 12000,
  retries = 1,
  signal = null,
} = {}) {
  if (!usuarioId) throw new Error("usuarioId requerido");
  if (!title || !startISO || !endISO) throw new Error("title/startISO/endISO requeridos");

  const base = getBaseURL();
  const url = `${base}/api/agenda-eventos`;

  const nd = normalizeNotesDescription({ notes, description });

  const payload = {
    usuarioId,
    tz,
    title: String(title).trim(),
    startISO,
    endISO,
    dueLocalDay: dueLocalDay || undefined,
    notes: nd.notes,
    description: nd.description,
    telefono: String(telefono || "").trim(),
    alertaWhatsapp: !!alertaWhatsapp,
  };

  const data = await callApi(url, { method: "POST", token, body: payload, timeoutMs, retries, signal });
  return data.item;
}

// ============================================================
// PUT /api/agenda-eventos/:id/status
// ============================================================
export async function updateAgendaEventoStatus({
  id,
  status,
  token = null,
  timeoutMs = 12000,
  retries = 1,
  signal = null,
} = {}) {
  if (!id) throw new Error("id requerido");
  if (!status) throw new Error("status requerido");

  const base = getBaseURL();
  const url = `${base}/api/agenda-eventos/${id}/status`;

  const data = await callApi(url, { method: "PUT", token, body: { status }, timeoutMs, retries, signal });
  return data.item;
}

// ============================================================
// PUT /api/agenda-eventos/:id  (editar)
// ============================================================
export async function updateAgendaEvento({
  id,
  usuarioId,
  tz = DEFAULT_TZ,
  title,
  startISO,
  endISO,
  dueLocalDay = null,
  notes = undefined,
  description = undefined,
  telefono = "",
  alertaWhatsapp = false,
  status = undefined,
  token = null,
  timeoutMs = 12000,
  retries = 1,
  signal = null,
} = {}) {
  if (!id) throw new Error("id requerido");
  if (!usuarioId) throw new Error("usuarioId requerido");

  const base = getBaseURL();
  const url = `${base}/api/agenda-eventos/${id}`;

  const hasNotes = notes != null || description != null;
  const nd = normalizeNotesDescription({ notes, description });

  const payload = {
    usuarioId,
    tz,
    title: title != null ? String(title).trim() : undefined,
    startISO: startISO || undefined,
    endISO: endISO || undefined,
    dueLocalDay: dueLocalDay || undefined,
    ...(hasNotes ? { notes: nd.notes, description: nd.description } : {}),
    telefono: String(telefono || "").trim(),
    alertaWhatsapp: !!alertaWhatsapp,
    status: status || undefined,
  };

  const data = await callApi(url, { method: "PUT", token, body: payload, timeoutMs, retries, signal });
  return data.item;
}

// ============================================================
// DELETE /api/agenda-eventos/:id  (eliminar real)
// ============================================================
export async function deleteAgendaEvento({
  id,
  usuarioId,
  tz = DEFAULT_TZ,
  token = null,
  timeoutMs = 12000,
  retries = 1,
  signal = null,
} = {}) {
  if (!id) throw new Error("id requerido");
  if (!usuarioId) throw new Error("usuarioId requerido");

  const base = getBaseURL();
  const qs = new URLSearchParams({ usuarioId, tz });
  const url = `${base}/api/agenda-eventos/${id}?${qs.toString()}`;

  return await callApi(url, { method: "DELETE", token, timeoutMs, retries, signal });
}
