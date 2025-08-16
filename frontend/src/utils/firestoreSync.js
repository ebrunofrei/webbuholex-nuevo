import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/services/firebaseConfig";

/**
 * Carga el perfil legal (branding/casillas/modulos) del usuario
 * @param {string} uid - ID de usuario
 * @returns {Promise<object|null>}
 */
export async function cargarPerfilUsuario(uid) {
  if (!uid) return null;
  try {
    const ref = doc(db, "usuarios", uid, "legales", "perfil");
    const snap = await getDoc(ref);
    return snap.exists() ? snap.data() : null;
  } catch (error) {
    console.error("[firestoreSync] Error al cargar perfil:", error);
    return null;
  }
}

/**
 * Guarda (merge) el perfil legal del usuario
 * @param {string} uid - ID de usuario
 * @param {object} data - branding/casillas/modulos, etc
 * @returns {Promise<void>}
 */
export async function guardarTodoUsuario(uid, data) {
  if (!uid || !data) return;
  try {
    const ref = doc(db, "usuarios", uid, "legales", "perfil");
    await setDoc(ref, data, { merge: true });
  } catch (error) {
    console.error("[firestoreSync] Error al guardar perfil:", error);
  }
}

// ---------------------------
// MOCKS PARA NOTIFICACIONES
// ---------------------------

/**
 * Devuelve un array de notificaciones de ejemplo (reemplazar por la consulta real a Firestore)
 * @returns {Promise<Array>}
 */
export async function fetchUserNotifications(/*uid*/) {
  // TODO: Implementa consulta real a Firestore, ahora mock:
  return [
    {
      id: "noti-demo-1",
      expType: "Judicial",
      expediente: "001-2025",
      entidad: "Poder Judicial",
      asunto: "Nueva resolución",
      descripcion: "Auto admisorio.",
      fileName: "resolucion.pdf",
      url: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
      fecha: new Date(),
      leido: false
    }
  ];
}

/**
 * Mock de subida de archivo a Storage (reemplaza con lógica real)
 */
export async function uploadFileToStorage(file, path) {
  // Lógica real: Usa uploadBytes y getDownloadURL de Firebase Storage.
  // MOCK: devuelve URL temporal.
  return { getDownloadURL: async () => URL.createObjectURL(file) };
}

/**
 * Mock de obtención de downloadURL (en Storage real, usar getDownloadURL)
 */
export async function getDownloadURL(fileRef) {
  return fileRef.getDownloadURL();
}

/**
 * Mock de marcar notificación como leída (actualiza 'leido' en Firestore)
 */
export async function markNotificationAsRead(noti) {
  // Implementa update real con setDoc/updateDoc en Firestore
  // Aquí solo loguea por ahora.
  console.log("Marcar como leída:", noti.id);
}
