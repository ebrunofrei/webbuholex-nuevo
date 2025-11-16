// backend/services/memoryService.js
// ============================================================
// 🧠 BúhoLex | Servicio de Memoria de Conversaciones (IA)
// - Guarda turnos user/assistant por usuarioId + expedienteId
// - Enriquecido con metadatos (intención, materia, juris, etc.)
// - Devuelve historial limpio para usar como contexto en /ia/chat
// ============================================================

import Conversacion from "../models/Conversacion.js";

/* ------------------------------------------------------------------ */
/* 🧠 obtenerHistorialUsuario                                          */
/* ------------------------------------------------------------------ */
/**
 * Devuelve el historial de mensajes (user / assistant) en orden
 * cronológico para un usuario y un expediente.
 *
 * Formato devuelto (lo que consume /api/ia/chat):
 * [
 *   { role: "user",      content: "..." },
 *   { role: "assistant", content: "..." },
 *   ...
 * ]
 *
 * Si en el futuro quieres hacer un "modo experto" que vea también
 * intencion, materiaDetectada, etc., puedes crear otra función:
 *   obtenerHistorialExtendido(...)
 */
export async function obtenerHistorialUsuario(usuarioId, expedienteId) {
  try {
    const uid = usuarioId || "invitado";
    const exp = expedienteId || "default";

    const convo = await Conversacion.findOne(
      { usuarioId: uid, expedienteId: exp },
      { mensajes: 1 } // sólo queremos el array de mensajes
    ).lean();

    if (!convo || !Array.isArray(convo.mensajes)) {
      return [];
    }

    // Devuelve únicamente {role, content} para el modelo.
    // La ruta /api/ia/chat se encarga luego de recortar por tokens.
    return convo.mensajes
      .filter((m) => m && m.role && typeof m.content === "string")
      .map((m) => ({
        role: m.role,
        content: m.content,
      }));
  } catch (err) {
    console.error("❌ Error en obtenerHistorialUsuario:", err);
    return [];
  }
}

/* ------------------------------------------------------------------ */
/* 🧾 guardarHistorial                                                 */
/* ------------------------------------------------------------------ */
/**
 * Inserta en Mongo el turno actual:
 *   - lo que preguntó el usuario
 *   - la respuesta de LitisBot
 *
 * Además guarda metadatos:
 *   - intencion (redaccion, analisis_juridico, etc.)
 *   - materiaDetectada
 *   - idioma, pais, modo
 *   - userEmail (si existiera)
 *   - jurisprudenciaIds usados en la respuesta
 *   - jurisprudenciaMeta (resumen de las resoluciones)
 *
 * Y limita el historial a las últimas N entradas (control de memoria).
 */
export async function guardarHistorial(
  usuarioId,
  expedienteId,
  pregunta,
  respuesta,
  meta = {}
) {
  try {
    const uid = usuarioId || "invitado";
    const exp = expedienteId || "default";

    const now = new Date();

    // Metadatos comunes a ambos mensajes (user y bot)
    const commonMeta = {
      intencion: meta.intencion || undefined,
      materiaDetectada: meta.materiaDetectada || undefined,
      idioma: meta.idioma || "es-PE",
      pais: meta.pais || "Perú",
      modo: meta.modo || "general",
      userEmail: meta.userEmail || undefined,
      jurisprudenciaIds: Array.isArray(meta.jurisprudenciaIds)
        ? meta.jurisprudenciaIds.map(String)
        : meta.jurisprudenciaIds
        ? [String(meta.jurisprudenciaIds)]
        : [],
      jurisprudenciaMeta: Array.isArray(meta.jurisprudenciaMeta)
        ? meta.jurisprudenciaMeta
        : [],
    };

    // Mensaje del usuario
    const userMsg = {
      role: "user",
      content: pregunta,
      fecha: now,
      ...commonMeta,
    };

    // Mensaje del asistente
    const botMsg = {
      role: "assistant",
      content: respuesta,
      fecha: now,
      ...commonMeta,
    };

    // Máximo número de mensajes a conservar (user+bot)
    // Ejemplo: 40 → aprox. 20 turnos.
    const MAX_MENSAJES = 40;

    // upsert = si no existe la conversación, la crea
    await Conversacion.findOneAndUpdate(
      { usuarioId: uid, expedienteId: exp },
      {
        $push: {
          mensajes: {
            $each: [userMsg, botMsg],
            $slice: -MAX_MENSAJES, // mantiene sólo los últimos N
          },
        },
        $set: { updatedAt: now },
        $setOnInsert: { createdAt: now },
      },
      { upsert: true, new: true }
    );

    return true;
  } catch (err) {
    console.error("❌ Error en guardarHistorial:", err);
    return false;
  }
}
