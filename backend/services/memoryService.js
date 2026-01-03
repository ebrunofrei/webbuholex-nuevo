// ============================================================
// 🧠 BúhoLex | SessionMemoryService (CANÓNICO)
// ------------------------------------------------------------
// - Memoria corta para IA (NO auditoría)
// - Fuente: MongoDB / Conversacion
// - Clave ÚNICA: usuarioId + sessionId (case_<caseId>)
// - Usado exclusivamente por /ia/chat
// ============================================================

import Conversacion from "../models/Conversacion.js";

// ===============================
// Configuración
// ===============================

const MAX_MENSAJES = 40;   // 20 turnos
const MAX_LEN_MSG = 6000;

// ===============================
// Helpers internos
// ===============================

function safeStr(v, maxLen = MAX_LEN_MSG) {
  if (v === null || v === undefined) return "";
  const s = String(v).replace(/\r/g, "").trim();
  return s.length > maxLen ? s.slice(0, maxLen) : s;
}

function isCanonicalSessionId(sessionId) {
  return typeof sessionId === "string" && sessionId.startsWith("case_");
}

function normalizeRole(roleRaw) {
  const r = String(roleRaw || "").toLowerCase();
  if (r === "assistant" || r === "system" || r === "user") return r;
  return "user";
}

function normalizeMeta(meta = {}) {
  return {
    // --- core ---
    intencion: meta.intencion,
    materiaDetectada: meta.materiaDetectada,
    idioma: meta.idioma || "es-PE",
    pais: meta.pais || "Perú",
    modo: meta.modo || "general",

    // --- orquestación ---
    toolMode: meta.toolMode,
    modoLitis: meta.modoLitis,
    ratioEngine: meta.ratioEngine,

    // --- agenda ---
    agendaHandled: meta.agendaHandled,
    agendaDraft: meta.agendaDraft,
    agendaEventPersisted: meta.agendaEventPersisted,
    agendaFollowUp: meta.agendaFollowUp,

    // --- jurisprudencia ---
    jurisprudenciaIds: Array.isArray(meta.jurisprudenciaIds)
      ? meta.jurisprudenciaIds.map(String)
      : [],
    jurisprudenciaMeta: Array.isArray(meta.jurisprudenciaMeta)
      ? meta.jurisprudenciaMeta
      : [],
  };
}

// ============================================================
// 🧠 OBTENER HISTORIAL DE SESIÓN (para LLM)
// ============================================================

export async function obtenerHistorialSesion(usuarioId, sessionId) {
  try {
    if (!usuarioId || !isCanonicalSessionId(sessionId)) {
      return [];
    }

    const convo = await Conversacion.findOne(
      { usuarioId, expedienteId: sessionId },
      { mensajes: 1 }
    ).lean();

    const mensajes = Array.isArray(convo?.mensajes)
      ? convo.mensajes
      : [];

    if (!mensajes.length) return [];

    return mensajes
      .slice(-MAX_MENSAJES)
      .filter(m => m && m.content)
      .map(m => ({
        role: normalizeRole(m.role),
        content: safeStr(m.content),
        fecha: m.fecha ? new Date(m.fecha).getTime() : 0,
      }))
      .sort((a, b) => a.fecha - b.fecha)
      .map(({ role, content }) => ({ role, content }));

  } catch (err) {
    console.error("❌ obtenerHistorialSesion:", err);
    return [];
  }
}

// ============================================================
// 🧾 GUARDAR TURNO DE SESIÓN (user + assistant)
// ============================================================

export async function guardarTurnoSesion(
  usuarioId,
  sessionId,
  pregunta,
  respuesta,
  meta = {}
) {
  try {
    if (!usuarioId || !isCanonicalSessionId(sessionId)) {
      return false;
    }

    const p = safeStr(pregunta);
    const r = safeStr(respuesta);

    if (!p || !r) return false;

    const now = new Date();
    const commonMeta = normalizeMeta(meta);

    const userMsg = {
      role: "user",
      content: p,
      fecha: now,
    };

    const botMsg = {
      role: "assistant",
      content: r,
      fecha: now,
      ...commonMeta,
    };

    await Conversacion.findOneAndUpdate(
      { usuarioId, expedienteId: sessionId },
      {
        $push: {
          mensajes: {
            $each: [userMsg, botMsg],
            $slice: -MAX_MENSAJES,
          },
        },
        $set: { updatedAt: now },
        $setOnInsert: { createdAt: now },
      },
      { upsert: true }
    );

    return true;
  } catch (err) {
    console.error("❌ guardarTurnoSesion:", err);
    return false;
  }
}

// ============================================================
// Export canónico
// ============================================================

export default {
  obtenerHistorialSesion,
  guardarTurnoSesion,
};
