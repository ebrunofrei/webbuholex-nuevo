// ============================================================
// 🧠 litisEngineCore.js – FRONTEND ENTERPRISE 2025 (FINAL)
// ------------------------------------------------------------
// - Payload limpio y compatible con backend
// - Manejo real de adjuntos y contexto
// - Normalizador universal de respuestas IA
// - Zero confusión de agenda, plazos o expediente por saludos
// ============================================================

// ============================================================
// CONFIG
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
// HELPERS DE URL
// ============================================================

function joinUrl(base, path) {
  const b = String(base || "").replace(/\/+$/, "");
  let p = String(path || "");

  if (!p) return b;
  if (/^https?:\/\//i.test(p)) return p;
  if (!p.startsWith("/")) p = "/" + p;

  if (b.endsWith("/api") && p.startsWith("/api/")) {
    p = p.replace(/^\/api/, "");
    if (!p.startsWith("/")) p = "/" + p;
  }

  if (!b) return p;
  return b + p;
}

function buildUrl(path) {
  return joinUrl(API_BASE, path);
}


// ============================================================
// SAFE FETCH
// ============================================================

async function safeFetchJson(url, options = {}, etiqueta = "request") {
  try {
    const res = await fetch(url, options);
    const rawText = await res.text().catch(() => "");

    let data = null;
    if (rawText) {
      try {
        data = JSON.parse(rawText);
      } catch {}
    }

    if (!res.ok) {
      const errMsg =
        (data && (data.error || data.message)) ||
        res.statusText ||
        rawText ||
        "HTTP_ERROR";

      console.error(`[litisEngineCore] HTTP ${res.status} en ${etiqueta}:`, errMsg);
      return { ok: false, data, status: res.status, error: errMsg };
    }

    return { ok: true, data, status: res.status, error: null };

  } catch (err) {
    if (err?.name === "AbortError") {
      return { ok: false, data: null, status: 0, error: "AbortError" };
    }
    console.error(`[litisEngineCore] Excepción en ${etiqueta}:`, err);
    return { ok: false, data: null, status: 0, error: err?.message || String(err) };
  }
}


// ============================================================
// NORMALIZADOR UNIVERSAL DE RESPUESTAS IA
// ============================================================

function nowISO() {
  return new Date().toISOString();
}

export function normalizeAssistantMessage(raw) {
  if (!raw || typeof raw !== "object") {
    return {
      role: "assistant",
      content: "No pude procesar la respuesta.",
      meta: { ok: false, createdAt: nowISO() },
    };
  }

  const texto =
    raw.reply ||
    raw.respuesta ||
    raw.text ||
    raw.content ||
    raw?.choices?.[0]?.message?.content ||
    "";

  return {
    role: "assistant",
    content: String(texto || ""),
    id:
      raw.id ||
      raw?.meta?.id ||
      `a-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    meta: {
      ...(raw.meta || {}),
      ok: raw.ok ?? true,
      createdAt: raw?.meta?.createdAt || nowISO(),
    },
  };
}


// ============================================================
// 1) PDF ANALYSIS
// ============================================================

export async function procesarPDFAdjunto(file, opts = {}) {
  try {
    if (!file) return { ok: false, error: "NO_FILE" };

    const form = new FormData();
    form.append("file", file);

    const url = buildUrl(LITISBOT_PDF_ROUTE);

    const { ok, data, error } = await safeFetchJson(
      url,
      { method: "POST", body: form, signal: opts.signal },
      "analizar PDF"
    );

    if (!ok || !data || data.ok === false) {
      return {
        ok: false,
        error: data?.error || data?.message || error || "PDF_BACKEND_ERROR",
      };
    }

    const jurisTextoBase = data.jurisTextoBase || data.resumen || "";
    const meta = data.meta || {};

    return {
      ok: true,
      data: {
        tipo: "pdf",
        nombreArchivo: file.name,
        jurisTextoBase: String(jurisTextoBase || ""),
        resumen: String(data.resumen || ""),
        embeddingId: data.embeddingId || null,
        meta,
      },
    };

  } catch (e) {
    return { ok: false, error: e?.message || String(e) };
  }
}


// ============================================================
// 2) CONTEXTO JURIS + PDF
// ============================================================

export async function construirContextoJuris(jurisSeleccionada, pdfContext) {
  const partes = [];

  if (jurisSeleccionada) {
    partes.push({
      tipo: "jurisprudencia",
      id: jurisSeleccionada._id || jurisSeleccionada.id || null,
      titulo: jurisSeleccionada.titulo || "",
      sala: jurisSeleccionada.sala || "",
      numero: jurisSeleccionada.numero || jurisSeleccionada.numeroExpediente || "",
      sumilla: jurisSeleccionada.sumilla || "",
      tema: jurisSeleccionada.tema || "",
      litisContext: jurisSeleccionada.litisContext || null,
      litisMeta: jurisSeleccionada.litisMeta || null,
      litisSource: jurisSeleccionada.litisSource || null,
      litisContextId: jurisSeleccionada.litisContextId || null,
    });
  }

  if (pdfContext) {
    const ctx = pdfContext?.ok && pdfContext?.data ? pdfContext.data : pdfContext;
    partes.push({ ...ctx, tipo: ctx.tipo || "pdf" });
  }

  return {
    tipo: "contexto-mixto",
    partes,
    hasJuris: Boolean(jurisSeleccionada),
    hasPdf: Boolean(pdfContext),
  };
}


// ============================================================
// 3) ENVIAR PROMPT A LITISBRAIN
// ============================================================

function normalizeAdjuntosMeta(adjuntos = []) {
  return (adjuntos || [])
    .map((a) => ({
      name: a.name || "",
      size: a.size || 0,
      type: a.type || "",
      kind: a.kind || "file",
      url: a.url || null,
    }))
    .filter(Boolean);
}

export async function enviarPromptLitis({
  prompt,
  usuarioId,
  usuarioNombre = null,

  expedienteId = null,
  adjuntos = [],
  contexto = null,

  pro = false,
  modoLitis = "litigante",
  personalidad = null,
  memoriaConfig = null,

  toolMode = null,
  materia = "general",
  idioma = "es-PE",
  pais = "Perú",
  ratioEngine = false,

  signal = undefined,
}) {
  // --------------------------------------------------------------------
  // NO fabricar expedienteId artificial para mensajes sociales
  // --------------------------------------------------------------------

  const finalExpedienteId = expedienteId || null;

  // --------------------------------------------------------------------
  // PAYLOAD LIMPIO Y COMPATIBLE CON BACKEND ENTERPRISE
  // --------------------------------------------------------------------

  const payload = {
    prompt: String(prompt || ""),
    usuarioId: usuarioId || "Invitado",
    usuarioNombre: usuarioNombre ? String(usuarioNombre) : undefined,

    expedienteId: finalExpedienteId,

    idioma: String(idioma),
    pais: String(pais),
    materia: String(materia),
    ratioEngine: Boolean(ratioEngine),
    toolMode: toolMode ?? null,

    adjuntos: normalizeAdjuntosMeta(adjuntos),
    contexto,

    pro: Boolean(pro),
    modoLitis,
    personalidad,
    memoriaConfig,
  };

  const url = buildUrl(LITISBOT_ROUTE);

  const { ok, data } = await safeFetchJson(
    url,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal,
    },
    "enviar prompt a IA"
  );

  if (!ok || !data || data.ok === false) {
    const msg =
      data?.message ||
      data?.error ||
      "Hubo un problema procesando tu consulta.";

    return normalizeAssistantMessage({
      ok: false,
      reply: msg,
      meta: {
        ...(data?.meta || {}),
        ok: false,
        error: data?.error || data?.message || "IA_ERROR",
      },
    });
  }

  return normalizeAssistantMessage(data);
}


// ============================================================
// EXPORT DEFAULT
// ============================================================

export default {
  procesarPDFAdjunto,
  construirContextoJuris,
  enviarPromptLitis,
};
