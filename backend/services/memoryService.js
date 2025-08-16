// services/memoryService.js
import firestore from "./firebaseAdmin.js";

const historialRef = firestore.collection("litisbot_historial");

export async function obtenerHistorialUsuario(usuarioId, expedienteId) {
  const key = `${usuarioId || "anonimo"}__${expedienteId || "default"}`;
  const doc = await historialRef.doc(key).get();
  return doc.exists ? (doc.data().mensajes || []) : [];
}

export async function guardarHistorial(usuarioId, expedienteId, pregunta, respuesta) {
  const key = `${usuarioId || "anonimo"}__${expedienteId || "default"}`;
  const docRef = historialRef.doc(key);
  const doc = await docRef.get();

  const nuevo = { pregunta, respuesta, fecha: new Date().toISOString() };
  const mensajesPrevios = doc.exists ? doc.data().mensajes || [] : [];
  const actualizados = [nuevo, ...mensajesPrevios].slice(0, 10); // guarda solo los últimos 10

  await docRef.set({ mensajes: actualizados }, { merge: true });
}
