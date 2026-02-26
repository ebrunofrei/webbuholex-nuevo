// backend/services/litisEngineCore.js
// ============================================================
// 🧠 Núcleo de LitisBot (backend) – Enterprise Clean (v3)
// ------------------------------------------------------------
// - Procesa PDFs, combina contexto jurisprudencial, y arma payload para IA.
// - Integra Semantic Pipeline (intents + ontología + latinismos + densidad).
// - Resolver de intent canónico: modelo > pipeline (solo internos) > fallback controlado.
// - Robusto, legible y mantenible.
// ============================================================
import { enviarMensajeIA } from "./chatClient.js";

import { runSemanticPipeline } from "../semantic/pipeline/masterSemanticPipeline.js";
import { isExternalIntent, isValidIntent } from "../semantic/intents/intentRegistry.js";
console.log("🔥 LITIS ENGINE CORE CARGADO 🔥");
/* ============================================================
   Helpers base (FUENTE ÚNICA)
============================================================ */

export function capText(str = "", maxChars = 12000) {
  const s = (str ?? "").toString();
  if (!s) return "";
  return s.length > maxChars ? s.slice(0, maxChars) : s;
}

export function safeStr(v) {
  return (v ?? "").toString();
}

export function getNombreCorto(user) {
  if (!user) return "colega";
  const nombre =
    user.nombre ||
    user.displayName ||
    user.name ||
    (user.email ? user.email.split("@")[0] : "");
  const limpio = (nombre || "").trim();
  if (!limpio) return "colega";
  if (limpio.length > 24) return limpio.slice(0, 24);
  return limpio;
}

export function extractUrls(text = "") {
  const t = safeStr(text);
  const re = /(https?:\/\/[^\s)]+)\b/gi;
  const matches = t.match(re) || [];
  return Array.from(new Set(matches.map((x) => x.trim()))).filter(Boolean);
}

/* ============================================================
   Helpers (Enterprise): adjuntos + intents
============================================================ */

function buildAdjuntosFinal({ prompt, adjuntos }) {
  const urls = extractUrls(prompt);
  const adjuntosNorm = Array.isArray(adjuntos) ? adjuntos : [];

  const urlAdjuntos = urls.map((u) => ({
    name: u,
    kind: "url",
    type: "text/url",
    url: u,
  }));

  return [...adjuntosNorm, ...urlAdjuntos];
}

function safeSemanticRun({ rawText, adjuntos }) {
  try {
    return runSemanticPipeline({ rawText, adjuntos }) || {};
  } catch (e) {
    console.warn("[semantic] pipeline error:", e?.message || String(e));
    return {};
  }
}

function resolveIntentEnterprise({ modelData, semantic }) {
  const reply = safeStr(
    modelData?.reply ||
      modelData?.content ||
      modelData?.message || // por compatibilidad
      ""
  );

  const resolved = {
    reply,
    intent: null,
    payload: null,
  };

  // ------------------------------------------------------------
  // 1) Intent del MODELO (si es válido)
  // ------------------------------------------------------------
  const modelIntent = typeof modelData?.intent === "string" ? modelData.intent : null;

  if (modelIntent && isValidIntent(modelIntent)) {
    // Externos: solo si vienen del modelo (ya están aquí)
    resolved.intent = modelIntent;

    resolved.payload =
      modelData?.payload && typeof modelData.payload === "object"
        ? modelData.payload
        : null;

    return resolved;
  }

  // ------------------------------------------------------------
  // 2) Intent del PIPELINE (solo internos)
  // ------------------------------------------------------------
  const pipelineIntent = semantic?.intent?.intent || null;

  if (
    pipelineIntent &&
    isValidIntent(pipelineIntent) &&
    !isExternalIntent(pipelineIntent)
  ) {
    resolved.intent = pipelineIntent;
    resolved.payload =
      semantic?.intent?.payload && typeof semantic.intent.payload === "object"
        ? semantic.intent.payload
        : null;

    return resolved;
  }

  // ------------------------------------------------------------
  // 3) Fallback heurístico CONTROLADO (solo internos legacy)
  //    Ej: agenda.create requiere payload del modelo (regla v1)
  // ------------------------------------------------------------
  if (reply && /agenda|agendar|evento|cita|reunión/i.test(reply)) {
    if (modelData?.payload && typeof modelData.payload === "object") {
      resolved.intent = "agenda.create";
      resolved.payload = modelData.payload;
    }
  }

  return resolved;
}

/* ============================================================
   1) PROCESAR PDF
============================================================ */

/**
 * Envía un PDF al backend para análisis.
 *
 * @param {File} file
 * @returns {Promise<{ok:boolean, contexto?:object, error?:string}>}
 */
export async function procesarPDFAdjunto(file) {
  if (!file) return { ok: false, error: "No se proporcionó archivo." };

  try {
    const fd = new FormData();
    fd.append("file", file);

    const resp = await fetch("/api/pdf/juris-context", {
      method: "POST",
      body: fd,
    });

    if (!resp.ok) {
      return {
        ok: false,
        error: "Error HTTP al procesar PDF.",
        status: resp.status,
      };
    }

    const data = await resp.json();

    if (!data?.ok || !data.jurisTextoBase) {
      return {
        ok: false,
        error: data?.error || "No se pudo construir contexto desde el PDF.",
        code: data?.code || "PDF_NO_CONTEXT",
      };
    }

    const jurisTextoBase = capText(data.jurisTextoBase, 12000);

    return {
      ok: true,
      contexto: {
        jurisTextoBase,
        meta: data.meta || {},
        origen: "pdfUsuario",
        filename: file?.name || "",
      },
      pdfContext: {
        jurisTextoBase,
        meta: data.meta || {},
        origen: "pdfUsuario",
        filename: file?.name || "",
      },
    };
  } catch (err) {
    return {
      ok: false,
      error: "No se pudo procesar el PDF en este momento.",
      debug: err?.message || String(err),
    };
  }
}

/* ============================================================
   2) CONSTRUCCIÓN DE CONTEXTO JURIS
============================================================ */

/**
 * Construye el contexto final que se enviará al modelo.
 *
 * @param {object} jurisSeleccionada
 * @param {object} pdfJurisContext
 * @param {object} contextPolicy
 * @returns {Promise<{hasJuris:boolean, jurisTextoBase:string, jurisMetas:array}>}
 */
export async function construirContextoJuris(
  jurisSeleccionada,
  pdfJurisContext,
  contextPolicy = { allowJuris: true }
) {
  const allowJuris = contextPolicy?.allowJuris !== false;

  const partes = [];
  const metas = [];

  // a) PDF
  if (pdfJurisContext?.jurisTextoBase) {
    partes.push(capText(pdfJurisContext.jurisTextoBase, 12000));
    metas.push({
      origen: pdfJurisContext.origen || "pdfUsuario",
      tipo: "pdf",
      filename: pdfJurisContext.filename || pdfJurisContext.meta?.filename || "",
      meta: pdfJurisContext.meta || {},
    });
  }

  // b) Jurisprudencia seleccionada (solo si permitido)
  if (allowJuris && jurisSeleccionada && typeof jurisSeleccionada === "object") {
    let jurisBlock = "";

    const id =
      jurisSeleccionada.id ||
      jurisSeleccionada._id ||
      jurisSeleccionada.jurisprudenciaId ||
      null;

    const cuerpoLocal =
      jurisSeleccionada.litisTextoBase ||
      jurisSeleccionada.textoPlano ||
      jurisSeleccionada.contenidoPlano ||
      jurisSeleccionada.contenido ||
      "";

    // Si no viene cuerpo pero hay id: intenta pedir contexto
    if (!cuerpoLocal && id) {
      try {
        const r = await fetch(`/api/jurisprudencia/${id}/context`);
        if (r.ok) {
          const j = await r.json();
          const ctx = safeStr(j?.context);
          if (ctx.trim()) jurisBlock = capText(ctx, 12000);
        }
      } catch {
        // silencioso
      }
    }

    // Si hay cuerpo local: arma bloque “humano”
    if (!jurisBlock && cuerpoLocal) {
      const header = [];

      if (jurisSeleccionada.numeroExpediente) {
        header.push(`EXPEDIENTE: ${jurisSeleccionada.numeroExpediente}`);
      }

      const organo = jurisSeleccionada.organo || "";
      const sala = jurisSeleccionada.sala || jurisSeleccionada.salaSuprema || "";
      if (organo || sala) header.push(`ÓRGANO/SALA: ${(organo + " " + sala).trim()}`);

      const esp = jurisSeleccionada.especialidad || "";
      const mat = jurisSeleccionada.materia || "";
      if (esp || mat) header.push(`MATERIA: ${(esp || mat).trim()}`);

      if (jurisSeleccionada.sumilla) header.push(`SUMILLA: ${jurisSeleccionada.sumilla}`);

      jurisBlock = [header.join(" | "), cuerpoLocal].filter(Boolean).join("\n\n");
      jurisBlock = capText(jurisBlock, 12000);
    }

    if (jurisBlock.trim()) {
      partes.push(jurisBlock);
      metas.push({ origen: "repositorioInterno", tipo: "jurisprudencia", id });
    }
  }

  const jurisTextoBase = partes.join("\n\n-----\n\n").trim();
  const hasJuris = jurisTextoBase.length > 0;

  return {
    hasJuris,
    jurisTextoBase: hasJuris ? jurisTextoBase : null,
    jurisMetas: metas,
  };
}

/* ============================================================
   3) ENVIAR PROMPT LITIS (Enterprise + Semantic Pipeline)
============================================================ */

/**
 * Envía un prompt al backend de LitisBot con contexto de jurisprudencia, PDF, y adjuntos.
 *
 * @param {object} opts
 * @returns {Promise<{ok:boolean, reply:string, intent:null|string, payload:null|object}>}
 */
export async function enviarPromptLitis(opts = {}) {
  console.log("🚀 enviarPromptLitis EJECUTÁNDOSE");
  // ------------------------------------------------------------
  // 1) Destructuración segura
  // ------------------------------------------------------------
  const {
    prompt = "",
    usuarioId = "invitado",
    sessionId, // 🔒
    caseId = null,
    adjuntos = [],
    contexto = {},
    pro = false,
    modoLitis = "litigante",
    personalidad = null,
    memoriaConfig = null,
    toolMode = null,
    contextPolicy = null,
    user = null,
  } = opts;

  if (!sessionId || !sessionId.startsWith("case_")) {
    throw new Error("sessionId canónico requerido");
  }

  // ------------------------------------------------------------
  // 2) Semantic Pipeline Maestro (robusto)
  // ------------------------------------------------------------
  const semantic = safeSemanticRun({ rawText: prompt, adjuntos });
console.log("🧠 SEMANTIC RESULT ↓↓↓");
console.log(JSON.stringify(semantic, null, 2));
console.log("🧠 SEMANTIC RESULT ↑↑↑");
  // ------------------------------------------------------------
  // 3) Adjuntos final (incluye URLs)
  // ------------------------------------------------------------
  const adjuntosFinal = buildAdjuntosFinal({ prompt, adjuntos });

  // ------------------------------------------------------------
  // 4) Contexto Jurisprudencial
  // ------------------------------------------------------------
  const { hasJuris, jurisTextoBase, jurisMetas } = contexto || {};

  const hasContext =
    !!jurisTextoBase ||
    (Array.isArray(jurisMetas) && jurisMetas.length > 0) ||
    !!hasJuris;

  // ------------------------------------------------------------
  // 5) Decisión de modo de razonamiento
  //    (asume que decideReasoningMode / inferMateria / buildVoiceProfile existen)
  // ------------------------------------------------------------
  const decision = decideReasoningMode({
    prompt,
    toolMode,
    modoLitis,
    hasContext,
    cognitiveDensity: semantic?.cognitiveDensity,
  });

  // ------------------------------------------------------------
  // 6) Humanización
  // ------------------------------------------------------------
  const voiceProfile = buildVoiceProfile({ user, pro, toolMode });

  const humanPreamble = {
    hasUser: Boolean(user),
    hasName: Boolean(user?.nombre || user?.displayName || user?.name),
    isAuthenticated: Boolean(user?.id || user?.uid),
  };

  const usuarioNombre = getNombreCorto(user);

  // ------------------------------------------------------------
  // 7) ToolMode auto (solo si no está definido)
  //    Importante: NO dispara análisis por defecto;
  //    solo etiqueta modo si el usuario lo pidió (intent document.review).
  // ------------------------------------------------------------
  let finalToolMode = toolMode;
  if (!finalToolMode && semantic?.intent?.intent === "document.review") {
    finalToolMode = "document_review";
  }

  // ------------------------------------------------------------
  // 8) Payload final
  // ------------------------------------------------------------
  const payload = {
    prompt: safeStr(prompt),
    usuarioId,
    sessionId,
    expedienteId: caseId || null,

    idioma: "es-PE",
    pais: "Perú",

    modo: decision?.modo,
    materia: inferMateria(prompt),
    ratioEngine: !!decision?.ratioEngine,

    // Contexto jurídico
    jurisTextoBase: jurisTextoBase || null,
    jurisMeta: Array.isArray(jurisMetas) ? jurisMetas : [],

    // Adjuntos
    adjuntos: adjuntosFinal,

    // Flags
    pro: !!pro,
    modoLitis,
    personalidad,
    memoriaConfig,
    toolMode: finalToolMode,

    // Perfil humano
    voiceProfile,
    humanPreamble,
    usuarioNombre,

    // Política contextual
    contextPolicy: contextPolicy || null,

    // Metadata semántica (para observabilidad y decisiones downstream)
    semanticMeta: {
      intent: semantic?.intent || null,
      ontology: semantic?.ontology || null,
      ontologyScore: semantic?.ontologyScore ?? null,
      latinScore: semantic?.latinScore ?? null,
      cognitiveDensity: semantic?.cognitiveDensity ?? null,
    },
  };
console.log("📌 sessionId recibido:", sessionId);
  // ------------------------------------------------------------
  // 9) Envío al modelo
  // ------------------------------------------------------------
  console.log("📦 PAYLOAD ENVIADO AL MODELO:");
console.log(JSON.stringify(payload.semanticMeta, null, 2));
  const data = await enviarMensajeIA(payload);

  // ------------------------------------------------------------
  // 10) Intent Resolver Enterprise
  // ------------------------------------------------------------
  const resolved = resolveIntentEnterprise({ modelData: data, semantic });
console.log("🎯 INTENT FINAL:", resolved.intent);
  // ------------------------------------------------------------
  // 11) Respuesta final (canónica)
  // ------------------------------------------------------------
  return {
    ok: true,
    reply: resolved.reply,
    intent: resolved.intent,
    payload: resolved.payload,
  };
}

export default {
  procesarPDFAdjunto,
  construirContextoJuris,
  enviarPromptLitis,
};