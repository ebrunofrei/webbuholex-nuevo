import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";

/**
 * Sube un archivo al storage y retorna la URL pública
 * @param {File} file - Archivo a subir
 * @param {string} carpeta - carpeta destino, ej: "notificaciones"
 * @returns {Promise<string>} URL del archivo subido
 */
export async function uploadFile(file, carpeta = "notificaciones") {
  if (!file) throw new Error("No se ha seleccionado archivo.");
  const storage = getStorage();
  const storageRef = ref(storage, `${carpeta}/${Date.now()}_${file.name}`);
  const snapshot = await uploadBytes(storageRef, file);
  return await getDownloadURL(snapshot.ref);
}
