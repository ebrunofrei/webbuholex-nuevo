import { db, storage } from "@/firebase";
import {
  collection,
  addDoc,
  Timestamp,
  doc,
  deleteDoc,
  updateDoc,
  query,
  orderBy,
  getDocs
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";

/**
 * Sube una portada al storage y retorna la URL pública
 * @param {File} archivo - Archivo de portada
 * @param {string} path - Ruta en storage (ej: `blog/portadas/nombre.jpg`)
 */
export async function subirPortadaBlog(archivo, path) {
  const storageRef = ref(storage, path);
  const snap = await uploadBytes(storageRef, archivo);
  return await getDownloadURL(snap.ref);
}

/**
 * Publica un nuevo artículo de blog
 * @param {Object} params - { titulo, contenido, resumen, autor, categoria, tags, urlPortada }
 */
export async function publicarArticuloBlog({ titulo, contenido, resumen, autor, categoria, tags = [], urlPortada }) {
  const col = collection(db, "blog");
  await addDoc(col, {
    titulo,
    contenido,
    resumen,
    autor,
    categoria,
    tags,
    urlPortada: urlPortada || "",
    fecha: Timestamp.now(),
  });
}

/**
 * Edita un artículo del blog por ID
 * @param {string} id - ID del artículo
 * @param {Object} nuevosDatos - Los campos a actualizar (igual estructura que publicar)
 */
export async function editarArticuloBlog(id, nuevosDatos) {
  const refDoc = doc(db, "blog", id);
  await updateDoc(refDoc, nuevosDatos);
}

/**
 * Elimina un artículo de blog y su portada (si existe)
 * @param {string} id - ID del documento de blog
 * @param {string} urlPortada - URL pública de la portada (opcional)
 */
export async function eliminarArticuloBlog(id, urlPortada) {
  await deleteDoc(doc(db, "blog", id));
  if (urlPortada) {
    try {
      // Si guardaste la ruta en Storage como campo en Firestore, usa ese path directo.
      // Si solo tienes la URL, convierte a path relativo:
      const url = new URL(urlPortada);
      const path = decodeURIComponent(
        url.pathname.replace(/^\/v0\/b\/[^/]+\/o\//, '').replace(/%2F/g, '/')
      );
      await deleteObject(ref(storage, path));
    } catch (e) {
      console.warn("No se pudo eliminar la portada:", e);
    }
  }
}

/**
 * Obtiene todos los artículos del blog ordenados por fecha descendente
 * @returns {Promise<Array>} - [{ id, ...data }]
 */
export async function obtenerArticulosBlog() {
  const q = query(collection(db, "blog"), orderBy("fecha", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  }));
}
