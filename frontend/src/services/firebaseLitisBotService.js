import { db, storage } from "./firebaseConfig";
import {
  collection,
  addDoc,
  query,
  where,
  orderBy,
  getDocs,
  Timestamp,
  doc,
  setDoc,
  getDoc,
  serverTimestamp,
  deleteDoc,
  updateDoc
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

//
// --------- HISTORIAL Y MENSAJES ---------
//

export async function guardarMensajeLitisBot({ uid, role, content }) {
  try {
    await addDoc(collection(db, "litisbot_chats"), {
      uid,
      role,
      content,
      timestamp: Timestamp.now(),
      favorito: false,
    });
  } catch (error) {
    console.error("Error guardando mensaje:", error);
  }
}

export async function obtenerHistorialLitisBot(uid, limit = 30) {
  try {
    const chatsRef = collection(db, "litisbot_chats");
    const q = query(
      chatsRef,
      where("uid", "==", uid),
      orderBy("timestamp", "desc")
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).reverse();
  } catch (error) {
    console.error("Error obteniendo historial de LitisBot:", error);
    return [];
  }
}

export async function borrarMensajeIndividualLitisBot(msgId) {
  try {
    await deleteDoc(doc(db, "litisbot_chats", msgId));
  } catch (e) {
    console.error("Error eliminando mensaje:", e);
  }
}

//
// --------- FAVORITOS ---------
//

export async function marcarFavoritoLitisBot(msgId, favorito = true) {
  try {
    const msgRef = doc(db, "litisbot_chats", msgId);
    await updateDoc(msgRef, { favorito });
  } catch (error) {
    console.error("Error actualizando favorito:", error);
  }
}

export async function obtenerFavoritosLitisBot(uid) {
  try {
    const chatsRef = collection(db, "litisbot_chats");
    const q = query(
      chatsRef,
      where("uid", "==", uid),
      where("favorito", "==", true),
      orderBy("timestamp", "desc")
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).reverse();
  } catch (error) {
    console.error("Error obteniendo favoritos de LitisBot:", error);
    return [];
  }
}

//
// --------- EXPORTAR ---------
//

export async function exportarHistorialLitisBot(uid) {
  const historial = await obtenerHistorialLitisBot(uid, 1000);
  return historial.map(msg => {
    const who = msg.role === "assistant" ? "LitisBot" : "Usuario";
    return `[${who}] ${msg.content}`;
  });
}

//
// --------- FREEMIUM / PREMIUM ---------
//

export async function incrementarContadorMensajes(uid) {
  const today = new Date().toISOString().slice(0, 10);
  const docRef = doc(db, "litisbot_usuarios", uid);
  const docSnap = await getDoc(docRef);

  let data = { mensajes: {}, updatedAt: serverTimestamp() };
  if (docSnap.exists()) data = docSnap.data();

  data.mensajes = data.mensajes || {};
  data.mensajes[today] = (data.mensajes[today] || 0) + 1;
  await setDoc(docRef, data, { merge: true });

  return data.mensajes[today];
}

export async function obtenerContadorMensajes(uid) {
  const today = new Date().toISOString().slice(0, 10);
  const docRef = doc(db, "litisbot_usuarios", uid);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) return 0;
  const data = docSnap.data();
  return (data.mensajes && data.mensajes[today]) || 0;
}

//
// --------- BORRAR TODO EL HISTORIAL DE UN USUARIO ---------
//

export async function borrarHistorialLitisBot(uid) {
  try {
    const chatsRef = collection(db, "litisbot_chats");
    const q = query(chatsRef, where("uid", "==", uid));
    const snapshot = await getDocs(q);
    const deletePromises = snapshot.docs.map(docu => deleteDoc(doc(db, "litisbot_chats", docu.id)));
    await Promise.all(deletePromises);
    return true;
  } catch (error) {
    console.error("Error borrando historial de LitisBot:", error);
    return false;
  }
}

//
// --------- HISTORIAL DE ARCHIVOS ---------
//

export async function obtenerHistorialArchivos(uid) {
  try {
    const archivosRef = collection(db, "litisbot_archivos");
    const q = query(archivosRef, where("uid", "==", uid), orderBy("fecha", "desc"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        fecha: data.fecha?.toDate ? data.fecha.toDate() : data.fecha
      };
    });
  } catch (error) {
    console.error("Error obteniendo historial de archivos:", error);
    return [];
  }
}

export async function subirArchivoLitisBot(uid, archivo) {
  try {
    const fecha = Date.now();
    const ruta = `litisbot_archivos/${uid}/${fecha}-${archivo.name}`;
    const archivoRef = ref(storage, ruta);

    // Sube el archivo a Firebase Storage
    await uploadBytes(archivoRef, archivo);

    // Obtén la URL de descarga
    const url = await getDownloadURL(archivoRef);

    // Guarda registro en Firestore
    await addDoc(collection(db, "litisbot_archivos"), {
      uid,
      nombre: archivo.name,
      tipo: archivo.type,
      fecha: serverTimestamp(),
      url
    });

    // Devuelve los datos para usar en el chat si lo necesitas
    return { nombre: archivo.name, tipo: archivo.type, url };
  } catch (error) {
    console.error("Error subiendo archivo:", error);
    throw error;
  }
}

//
// --------- NOTIFICACIONES ---------
//

export async function obtenerNotificaciones(usuarioId) {
  try {
    const notifsRef = collection(db, "notificaciones");
    const q = query(
      notifsRef,
      where("usuarioId", "==", usuarioId),
      orderBy("fecha", "desc")
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error("Error obteniendo notificaciones:", error);
    return [];
  }
}
// --------- GUARDAR MODO/CONTEXTO POR USUARIO ---------
/**
 * Guarda el último modo/contexto de uso del chat LitisBot por usuario.
 * @param {string} uid - ID del usuario.
 * @param {string} modo - "oficina", "audiencia", etc.
 */
export async function guardarHistorialModoLitisBot(uid, modo) {
  try {
    await setDoc(
      doc(db, "litisbot_historial_modos", uid),
      {
        ultimoModo: modo,
        actualizado: serverTimestamp()
      },
      { merge: true }
    );
  } catch (e) {
    console.error("Error guardando modo LitisBot:", e);
  }
}
