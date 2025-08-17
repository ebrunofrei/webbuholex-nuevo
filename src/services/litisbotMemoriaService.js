// src/services/litisbotMemoriaService.js
import { db } from "./firebaseConfig";
import { doc, getDoc, setDoc, updateDoc, arrayUnion } from "firebase/firestore";

// ----- MEMORIA POR CASO -----

// Obtener historial de mensajes de un usuario para un caso específico
export async function obtenerMemoriaPorCaso(usuarioId, casoId) {
  if (!usuarioId || !casoId) return [];
  const ref = doc(db, "usuarios_litisbot", usuarioId, "casos", casoId);
  const snap = await getDoc(ref);
  return snap.exists() ? snap.data().historial || [] : [];
}

// Guardar (o actualizar) el historial de un usuario/caso
export async function guardarMemoriaPorCaso(usuarioId, casoId, historial) {
  if (!usuarioId || !casoId) return;
  const ref = doc(db, "usuarios_litisbot", usuarioId, "casos", casoId);
  await setDoc(ref, { historial }, { merge: true });
}

// ----- PERFIL DE USUARIO -----

// Guardar o actualizar campos del perfil del usuario
export async function actualizarPerfilUsuario(usuarioId, campos) {
  if (!usuarioId) return;
  const ref = doc(db, "usuarios_litisbot", usuarioId);
  await setDoc(ref, campos, { merge: true });
}

// Obtener perfil completo del usuario
export async function obtenerPerfilUsuario(usuarioId) {
  if (!usuarioId) return null;
  const ref = doc(db, "usuarios_litisbot", usuarioId);
  const snap = await getDoc(ref);
  return snap.exists() ? snap.data() : null;
}

// ----- FAVORITOS, FRASES, RECUERDOS -----

// Añadir frase favorita, anécdota, logro, etc. al usuario
export async function agregarRecuerdo(usuarioId, campo, texto) {
  if (!usuarioId || !campo) return;
  const ref = doc(db, "usuarios_litisbot", usuarioId);
  await updateDoc(ref, {
    [campo]: arrayUnion(texto)
  });
}
