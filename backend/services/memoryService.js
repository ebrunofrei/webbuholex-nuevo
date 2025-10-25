// backend/services/memoryService.js

import Conversacion from "../models/Conversacion.js";

/**
 * 🧠 obtenerHistorialUsuario
 * Devuelve el historial de mensajes (user / assistant) en orden cronológico
 * para un usuario y un expediente.
 *
 * Formato devuelto:
 * [
 *   { role: "user", content: "..." },
 *   { role: "assistant", content: "..." },
 *   ...
 * ]
 *
 * Esto es lo que tu ruta /api/ia/chat usa para armar el contexto
 * antes de llamar a OpenAI.
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

    // IMPORTANTE:
    // El modelo necesita historial como [{role, content}, ...]
    // Aquí devolvemos exactamente eso.
    // (OJO: NO cortamos todavía. Si quieres limitar tokens puedes recortar aquí.)
    return convo.mensajes.map((m) => ({
      role: m.role,
      content: m.content,
    }));
  } catch (err) {
    console.error("❌ Error en obtenerHistorialUsuario:", err);
    return [];
  }
}

/**
 * 🧾 guardarHistorial
 * Inserta en Mongo el turno actual:
 *   - lo que preguntó el usuario
 *   - la respuesta de LitisBot
 *
 * También guarda metadatos como intención detectada, materiaDetectada,
 * idioma y país. Eso te sirve luego para analytics y para auditar
 * qué tipo de ayuda se le dio al usuario.
 *
 * Además:
 * - limita el historial a las últimas N interacciones para que no
 *   crezca infinito dentro del mismo expediente (control de memoria).
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

    // construimos los dos mensajes (usuario y bot)
    const now = new Date();

    const userMsg = {
      role: "user",
      content: pregunta,
      intencion: meta.intencion || undefined,
      materiaDetectada: meta.materiaDetectada || undefined,
      idioma: meta.idioma || "es-PE",
      pais: meta.pais || "Perú",
      fecha: now,
    };

    const botMsg = {
      role: "assistant",
      content: respuesta,
      intencion: meta.intencion || undefined,
      materiaDetectada: meta.materiaDetectada || undefined,
      idioma: meta.idioma || "es-PE",
      pais: meta.pais || "Perú",
      fecha: now,
    };

    // upsert = si no existe la conversación, la crea
    const convo = await Conversacion.findOneAndUpdate(
      { usuarioId: uid, expedienteId: exp },
      {
        $push: { mensajes: { $each: [userMsg, botMsg] } },
        $set: { updatedAt: now },
        $setOnInsert: { createdAt: now },
      },
      { upsert: true, new: true }
    );

    // 🔪 Control de tamaño del historial
    // Mantener, por ejemplo, sólo las últimas ~40 entradas
    // (20 turnos usuario+bot). Ajusta a tu gusto.
    const MAX_MENSAJES = 40;
    if (convo.mensajes.length > MAX_MENSAJES) {
      convo.mensajes = convo.mensajes.slice(-MAX_MENSAJES);
      await convo.save();
    }

    return true;
  } catch (err) {
    console.error("❌ Error en guardarHistorial:", err);
    return false;
  }
}
