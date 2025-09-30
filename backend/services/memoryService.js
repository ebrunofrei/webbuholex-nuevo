// backend/services/memoryService.js
import { db } from "#services/myFirebaseAdmin.js";

/**
 * 📌 Referencia principal al historial en Firestore
 */
const historialRef = db.collection("litisbot_historial");

/**
 * 📌 Obtiene el historial de un usuario (máx. 10 últimos mensajes)
 * @param {string} usuarioId - ID del usuario
 * @param {string} expedienteId - ID del expediente (opcional)
 * @returns {Promise<Array>} Lista de mensajes [{ pregunta, respuesta, fecha }]
 */
export async function obtenerHistorialUsuario(usuarioId, expedienteId) {
  try {
    const key = `${usuarioId || "anonimo"}__${expedienteId || "default"}`;
    const doc = await historialRef.doc(key).get();
    return doc.exists ? (doc.data().mensajes || []) : [];
  } catch (err) {
    console.error("❌ Error al obtener historial:", err);
    return [];
  }
}

/**
 * 📌 Guarda una nueva interacción en el historial del usuario
 * Se conservan solo los últimos 10 mensajes.
 * @param {string} usuarioId
 * @param {string} expedienteId
 * @param {string} pregunta
 * @param {string} respuesta
 */
export async function guardarHistorial(usuarioId, expedienteId, pregunta, respuesta) {
  try {
    const key = `${usuarioId || "anonimo"}__${expedienteId || "default"}`;
    const docRef = historialRef.doc(key);
    const doc = await docRef.get();

    const nuevo = { pregunta, respuesta, fecha: new Date().toISOString() };
    const mensajesPrevios = doc.exists ? doc.data().mensajes || [] : [];
    const actualizados = [nuevo, ...mensajesPrevios].slice(0, 10);

    await docRef.set({ mensajes: actualizados }, { merge: true });
    return true;
  } catch (err) {
    console.error("❌ Error al guardar historial:", err);
    return false;
  }
}
