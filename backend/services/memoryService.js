// ============================================================================
// 🧠 SessionMemoryService — R5 (2026) — alineado con TurnContextResolver
// ----------------------------------------------------------------------------
// RESPONSABILIDAD:
// - Mantener memoria corta *coherente con análisis semántico*
// - Cortar historial cuando analysisReset=true
// - Persistir tags para decisiones futuras
// - NO es auditoría, NO es historial legalmente relevante
// ============================================================================

import Conversacion from "../models/Conversacion.js";

// Config
const MAX_MENSAJES = 40;
const MAX_LEN_MSG = 6000;

// ============================================================================
// Helpers
// ============================================================================
function safeStr(v, maxLen = MAX_LEN_MSG) {
  if (!v) return "";
  const s = String(v).replace(/\r/g, "").trim();
  return s.length > maxLen ? s.slice(0, maxLen) : s;
}

function isCanonicalSessionId(sid) {
  return typeof sid === "string" && sid.startsWith("case_");
}

function normalizeRole(r) {
  r = String(r || "").toLowerCase();
  return ["user", "assistant"].includes(r) ? r : "user";
}

// ============================================================================
// 🧠 OBTENER HISTORIAL → RESPETA RESET & TAGS (R5)
// ============================================================================
export async function obtenerHistorialSesion(usuarioId, sessionId, turnContext = null) {
  try {
    if (!usuarioId || !isCanonicalSessionId(sessionId)) return [];

    const convo = await Conversacion.findOne(
      { usuarioId, expedienteId: sessionId },
      { mensajes: 1 }
    ).lean();

    let msgs = Array.isArray(convo?.mensajes) ? convo.mensajes : [];

    // 1. Cortar historial si este turno es un NEW_TOPIC o HARD_RESET
    if (turnContext?.analysisReset) {
      const lastResetIndex = [...msgs].reverse().findIndex(
        (m) => m?.turnContext?.analysisReset === true
      );

      if (lastResetIndex !== -1) {
        msgs = msgs.slice(msgs.length - lastResetIndex);
      }
    }

    // 2. Normalizar salida
    return msgs
      .slice(-MAX_MENSAJES)
      .map((m) => ({
        role: normalizeRole(m.role),
        content: safeStr(m.content),
        turnContext: m.turnContext || null,
        fecha: m.fecha ? new Date(m.fecha).getTime() : 0,
      }))
      .sort((a, b) => a.fecha - b.fecha)
      .map(({ role, content }) => ({ role, content }));

  } catch (err) {
    console.error("❌ obtenerHistorialSesion:", err);
    return [];
  }
}

// ============================================================================
// 🧾 GUARDAR TURNO → GUARDA turnContext & tags
// ============================================================================
export async function guardarTurnoSesion(
  usuarioId,
  sessionId,
  pregunta,
  respuesta,
  meta = {},
  turnContext = null
) {
  try {
    if (!usuarioId || !isCanonicalSessionId(sessionId)) return false;

    const p = safeStr(pregunta);
    const r = safeStr(respuesta);
    if (!p || !r) return false;

    const now = new Date();

    const userMsg = {
      role: "user",
      content: p,
      fecha: now,
      turnContext,
    };

    const botMsg = {
      role: "assistant",
      content: r,
      fecha: now,
      turnContext,
      meta,
    };

    await Conversacion.findOneAndUpdate(
      { usuarioId, expedienteId: sessionId },
      {
        $push: {
          mensajes: { $each: [userMsg, botMsg], $slice: -MAX_MENSAJES },
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

// ============================================================================
// Export
// ============================================================================
export default {
  obtenerHistorialSesion,
  guardarTurnoSesion,
};
