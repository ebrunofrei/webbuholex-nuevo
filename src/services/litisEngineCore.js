// ============================================================================
// 🧠 litisEngineCore.js – FRONTEND ENTERPRISE 2026 (CANÓNICO)
// ----------------------------------------------------------------------------
// - Payload compatible con Backend Decisional
// - Manejo de adjuntos y contexto mixto (Juris + PDF)
// - Guardián de Integridad de Sesión
// ============================================================================

// ============================================================
// CONFIGURACIÓN DE RUTAS
// ============================================================

const RAW_BASE =
  import.meta.env.VITE_CHAT_API_BASE_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_URL ||
  "";

const API_BASE = String(RAW_BASE || "").replace(/\/+$/, "");

const LITISBOT_ROUTE = String(import.meta.env.VITE_LITISBOT_ROUTE || "/ia/chat");
const LITISBOT_PDF_ROUTE = String(
  import.meta.env.VITE_LITISBOT_PDF_ROUTE || "/api/pdf/juris-context"
);

// ============================================================
// HELPERS DE RED (URL & FETCH)
// ============================================================

function buildUrl(path) {
  const base = API_BASE.replace(/\/+$/, "");
  let p = String(path || "");
  if (!p.startsWith("/") && !/^https?:\/\//i.test(p)) p = "/" + p;
  return /^https?:\/\//i.test(p) ? p : base + p;
}

async function safeFetchJson(url, options = {}, etiqueta = "request") {
  try {
    const res = await fetch(url, {
      ...options,
      headers: { "Content-Type": "application/json", ...options.headers },
    });
    
    const rawText = await res.text().catch(() => "");
    let data = null;
    if (rawText) {
      try { data = JSON.parse(rawText); } catch { data = { raw: rawText }; }
    }

    if (!res.ok) {
      const errMsg = data?.error || data?.message || res.statusText || "HTTP_ERROR";
      console.error(`[litisEngineCore] HTTP ${res.status} en ${etiqueta}:`, errMsg);
      return { ok: false, data, status: res.status, error: errMsg };
    }

    return { ok: true, data, status: res.status };
  } catch (err) {
    console.error(`[litisEngineCore] Excepción en ${etiqueta}:`, err);
    return { ok: false, error: err?.message || String(err) };
  }
}

// ============================================================
// NORMALIZADOR DE MENSAJES IA
// ============================================================

export function normalizeAssistantMessage(raw) {
  const now = new Date().toISOString();
  if (!raw || typeof raw !== "object") {
    return {
      role: "assistant",
      content: "Error de comunicación con el Kernel.",
      meta: { ok: false, createdAt: now },
    };
  }

  const texto = raw.respuesta || raw.reply || raw.text || raw.content || "";

  return {
    role: "assistant",
    content: String(texto),
    id: raw.id || `a-${Date.now()}`,
    meta: {
      ...(raw.meta || {}),
      ok: raw.ok ?? true,
      createdAt: raw.meta?.createdAt || now,
      intent: typeof raw.intent === "string" ? raw.intent : null,
      payload: raw.intent && typeof raw.payload === "object" ? raw.payload : null,
    },
  };
}

// ============================================================
// 1) ANÁLISIS DE DOCUMENTOS (PDF)
// ============================================================

export async function procesarPDFAdjunto(file, opts = {}) {
  if (!file) return { ok: false, error: "NO_FILE" };

  const form = new FormData();
  form.append("file", file);

  const { ok, data, error } = await safeFetchJson(
    buildUrl(LITISBOT_PDF_ROUTE),
    { method: "POST", body: form, headers: {}, signal: opts.signal }, // Headers vacíos para FormData
    "analizar PDF"
  );

  if (!ok || !data?.ok) {
    return { ok: false, error: data?.error || error || "PDF_BACKEND_ERROR" };
  }

  return {
    ok: true,
    data: {
      tipo: "pdf",
      nombreArchivo: file.name,
      jurisTextoBase: String(data.jurisTextoBase || data.resumen || ""),
      meta: data.meta || {},
    },
  };
}

// ============================================================
// 2) CONSTRUCTOR DE CONTEXTO MIXTO
// ============================================================

export async function construirContextoJuris(jurisSeleccionada, pdfContext) {
  const partes = [];

  if (jurisSeleccionada) {
    partes.push({
      tipo: "jurisprudencia",
      id: jurisSeleccionada._id || jurisSeleccionada.id,
      titulo: jurisSeleccionada.titulo || "",
      numero: jurisSeleccionada.numero || jurisSeleccionada.numeroExpediente || "",
      sumilla: jurisSeleccionada.sumilla || "",
    });
  }

  if (pdfContext) {
    const ctx = pdfContext.data || pdfContext;
    partes.push({ ...ctx, tipo: "pdf" });
  }

  return {
    tipo: "contexto-mixto",
    partes,
    hasJuris: !!jurisSeleccionada,
    hasPdf: !!pdfContext,
  };
}

// ============================================================
// 3) ENGINE CORE: ENVÍO DE PROMPT
// ============================================================

export async function enviarPromptLitis(params) {
  const {
    prompt,
    usuarioId,
    sessionId,      // 🔑 CRÍTICO
    expedienteId,   // 📁 Contexto Pro
    adjuntos = [],
    contexto = null,
    pro = false,
    modoLitis = "litigante",
    signal,
  } = params;

  // 🛡️ GUARDIÁN DE INTEGRIDAD (Previene ReferenceError en el chat)
  if (!sessionId) {
    console.error("❌ Bloqueo Core: Intentando enviar sin sessionId");
    return normalizeAssistantMessage({
      ok: false,
      reply: "Error de sesión: Reinicie el chat para obtener una identidad de consulta válida.",
    });
  }

  const payload = {
    prompt: String(prompt || ""),
    usuarioId: usuarioId || "Invitado",
    sessionId: sessionId,
    expedienteId: expedienteId || null,
    adjuntos: adjuntos.map(a => ({ name: a.name, size: a.size, kind: "file" })),
    contexto,
    pro: Boolean(pro),
    modoLitis,
    pais: "Perú",
    idioma: "es-PE"
  };

  const { ok, data } = await safeFetchJson(
    buildUrl(LITISBOT_ROUTE),
    { method: "POST", body: JSON.stringify(payload), signal },
    "enviar prompt a IA"
  );

  if (!ok || !data?.ok) {
    return normalizeAssistantMessage({
      ok: false,
      reply: data?.error || "Hubo un problema procesando tu consulta legal.",
    });
  }

  return normalizeAssistantMessage(data);
}

// ============================================================
// EXPORT DEFAULT (ORQUESTACIÓN CANÓNICA)
// ============================================================

export default {
  procesarPDFAdjunto,
  construirContextoJuris,
  enviarPromptLitis,
  normalizeAssistantMessage
};