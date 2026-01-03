// src/services/litisEngineCore.js
// ============================================================
// 🧠 Núcleo de LitisBot (backend) – Refactor ENTERPRISE
// ------------------------------------------------------------
// - Procesa PDFs, combina contexto jurisprudencial, y arma payload para IA.
// - Soporte completo de contexto, adjuntos, y análisis de resolución.
// - Optimización de seguridad y robustez.
// ============================================================

import { enviarMensajeIA } from "./chatClient.js";

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
  const nombre = user.nombre || user.displayName || user.name || (user.email ? user.email.split("@")[0] : "");
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

    const resp = await fetch("/api/pdf/juris-context", { method: "POST", body: fd });

    if (!resp.ok) {
      return { ok: false, error: "Error HTTP al procesar PDF.", status: resp.status };
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
 * @param {object} jurisSeleccionada - Objeto de la jurisprudencia seleccionada.
 * @param {object} pdfJurisContext - Contexto procesado de un PDF.
 * @param {object} contextPolicy - Política de contexto (si se permite jurisprudencia).
 * @returns {Promise<{hasJuris:boolean, jurisTextoBase:string, jurisMetas:array}>}
 */
export async function construirContextoJuris(jurisSeleccionada, pdfJurisContext, contextPolicy = { allowJuris: true }) {
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
      if (jurisSeleccionada.numeroExpediente)
        header.push(`EXPEDIENTE: ${jurisSeleccionada.numeroExpediente}`);

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
   3) ENVIAR PROMPT LITIS (HUMANO)
============================================================ */

/**
 * Envía un prompt al backend de LitisBot con contexto de jurisprudencia, PDF, y adjuntos.
 *
 * @param {object} opts - Opciones para la consulta, incluyendo el prompt, usuario, contexto, etc.
 * @returns {Promise<{role:"assistant", content:string, meta?:any}>}
 */
export async function enviarPromptLitis(opts = {}) {
  const {
    prompt = "",
    usuarioId = "invitado",
    sessionId,          // 🔒
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
  const urls = extractUrls(prompt);
  const adjuntosNorm = Array.isArray(adjuntos) ? adjuntos : [];

  const adjuntosFinal = [
    ...adjuntosNorm,
    ...urls.map((u) => ({ name: u, kind: "url", type: "text/url", url: u })),
  ];

  const { hasJuris, jurisTextoBase, jurisMetas } = contexto || {};

  const hasContext =
    !!jurisTextoBase ||
    (Array.isArray(jurisMetas) && jurisMetas.length > 0) ||
    !!hasJuris;

  // Decisión de modo y ratioEngine
  const decision = decideReasoningMode({
    prompt,
    toolMode,
    modoLitis,
    hasContext,
  });

  // Perfil humano (para backend)
  function buildHumanPreamble({ user }) {
  return {
    hasUser: Boolean(user),
    hasName: Boolean(user?.nombre || user?.displayName || user?.name),
    isAuthenticated: Boolean(user?.id || user?.uid),
  };
}

  const voiceProfile = buildVoiceProfile({ user, pro, toolMode });
  const humanPreamble = buildHumanPreamble({ user });
  const usuarioNombre = getNombreCorto(user);

  const payload = {
    prompt: safeStr(prompt),
    usuarioId,
    expedienteId,

    idioma: "es-PE",
    pais: "Perú",

    modo: decision.modo,
    materia: inferMateria(prompt),
    ratioEngine: !!decision.ratioEngine,

    // Contexto
    jurisTextoBase: jurisTextoBase || null,
    jurisMeta: Array.isArray(jurisMetas) ? jurisMetas : [],

    adjuntos: adjuntosFinal,

    pro: !!pro,
    modoLitis,
    personalidad,
    memoriaConfig,
    toolMode,

    // Nueva clave para humanizar
    voiceProfile,
    humanPreamble,
    usuarioNombre,

    contextPolicy: contextPolicy || null,
  };

  // Envío del prompt
  const data = await enviarMensajeIA(payload);
  return data;
}

export default {
  procesarPDFAdjunto,
  construirContextoJuris,
  enviarPromptLitis,
};
