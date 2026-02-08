// ============================================================
// 🦉 BÚHOLEX — Agenda Eventos (Manuales) Service
// ------------------------------------------------------------
// CANÓNICO FINAL — ESTABLE
//
// PRINCIPIOS:
// - La agenda es LIBRE
// - NO usa caseId
// - NO usa sessionId
// - Frontend NO interpreta negocio
// - Backend es la fuente de verdad
// - CRUD predecible (crear / editar / eliminar)
// ============================================================

const DEFAULT_TZ = "America/Lima";

// ============================================================
// 🌐 BASE URL (ROBUSTO)
// ============================================================
function getBaseURL() {
  const raw = (import.meta?.env?.VITE_API_URL || "").trim();
  if (raw) return raw.replace(/\/$/, "");
  return window.location.origin;
}

// ============================================================
// 🔐 AUTH
// ============================================================
function authHeaders(token) {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// ============================================================
// 🧯 SAFE JSON
// ============================================================
async function safeJson(res) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

// ============================================================
// ⏱️ FETCH + TIMEOUT (SINGLE CONTROLLER)
// ============================================================
function fetchWithTimeout(url, options = {}, timeoutMs = 12000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  if (options.signal) {
    if (options.signal.aborted) controller.abort();
    else {
      options.signal.addEventListener(
        "abort",
        () => controller.abort(),
        { once: true }
      );
    }
  }

  return fetch(url, { ...options, signal: controller.signal })
    .finally(() => clearTimeout(timer));
}

function isAbortError(e) {
  return (
    e?.name === "AbortError" ||
    String(e?.message || "").toLowerCase().includes("abort")
  );
}

// ============================================================
// 🧠 NORMALIZAR NOTES / DESCRIPTION
// ============================================================
function normalizeNotesDescription({ notes = "", description = "" } = {}) {
  const n = String(notes || "").trim();
  const d = String(description || "").trim();
  const unified = n || d;
  return { notes: unified, description: unified };
}

// ============================================================
// 🔁 CORE API CALL (TOLERANTE)
// ============================================================
async function callApi(
  url,
  {
    method = "GET",
    token = null,
    body = null,
    timeoutMs = 12000,
    retries = 1,
    signal = null,
  } = {}
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

      if (!res.ok) {
        throw new Error(
          data?.detail ||
          data?.error ||
          `HTTP ${res.status}`
        );
      }

      // 🔑 CLAVE:
      // Aceptamos:
      // - { item }
      // - { items }
      // - { ok: true }
      // - {}
      return data ?? {};
    } catch (e) {
      lastErr = e;
      attempt++;

      if (isAbortError(e)) throw e;
      if (attempt > retries) throw e;

      await new Promise((r) =>
        setTimeout(350 + (attempt - 1) * 300)
      );
    }
  }

  throw lastErr;
}

// ============================================================
// 📆 GET — RANGO
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

  const data = await callApi(url, {
    method: "GET",
    token,
    timeoutMs,
    retries,
    signal,
  });

  return data.items || [];
}

// ============================================================
// ✍️ POST — CREAR EVENTO
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
  if (!title || !startISO || !endISO) {
    throw new Error("title/startISO/endISO requeridos");
  }

  const base = getBaseURL();
  const url = `${base}/api/agenda-eventos`;

  const nd = normalizeNotesDescription({ notes, description });

  const startDate = new Date(startISO);
  const endDate = new Date(endISO);

  const payload = {
    usuarioId,
    tz,
    title: String(title).trim(),

    startISO,
    endISO,

    startUnix: Math.floor(startDate.getTime() / 1000),
    endUnix: Math.floor(endDate.getTime() / 1000),

    dueLocalDay: dueLocalDay || undefined,

    notes: nd.notes,
    description: nd.description,

    telefono: String(telefono || "").trim(),
    alertaWhatsapp: !!alertaWhatsapp,

    status: "active",
  };

  const data = await callApi(url, {
    method: "POST",
    token,
    body: payload,
    timeoutMs,
    retries,
    signal,
  });

  if (!data?.item?._id) {
    throw new Error("Evento creado sin _id");
  }

  return data.item;

  }

// ============================================================
// ✏️ PUT — EDITAR EVENTO
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

  ...(startISO
    ? { startUnix: Math.floor(new Date(startISO).getTime() / 1000) }
    : {}),
  ...(endISO
    ? { endUnix: Math.floor(new Date(endISO).getTime() / 1000) }
    : {}),

  ...(startISO ? { dueLocalDay: dueLocalDay || undefined } : {}),

  ...(hasNotes
    ? { notes: nd.notes, description: nd.description }
    : {}),

  telefono: String(telefono || "").trim(),
  alertaWhatsapp: !!alertaWhatsapp,

  status: status || undefined,
};

  const data = await callApi(url, {
    method: "PUT",
    token,
    body: payload,
    timeoutMs,
    retries,
    signal,
  });

  if (!data?.item?._id) {
    throw new Error("Evento actualizado sin _id");
  }

  return data.item;

  }

// ============================================================
// 🚦 PUT — STATUS
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

  const data = await callApi(url, {
    method: "PUT",
    token,
    body: { status },
    timeoutMs,
    retries,
    signal,
  });

  if (!data?.item?._id) {
    return {
      ok: true,
      updatedId: id,
      status,
    };
  }

  return data.item;

  }

// ============================================================
// 🗑️ DELETE — ELIMINAR EVENTO
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

  const data = await callApi(url, {
    method: "DELETE",
    token,
    timeoutMs,
    retries,
    signal,
  });

  return data?.deleted === true
    ? { ok: true, deletedId: id }
    : { ok: true, deletedId: id };
}
