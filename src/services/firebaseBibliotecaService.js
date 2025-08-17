import { db, storage } from "@/firebase";
import {
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  where,
  doc,
  updateDoc,
  deleteDoc,
  Timestamp,
  limit,
  startAfter,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";

// -------- SUBIR ARCHIVO PDF/EPUB/DOC Y OBTENER URL PÚBLICA --------
export async function subirArchivoLibro(archivo, path) {
  // Usa el storage ya inicializado (import { storage } from "@/firebase";)
  const storageRef = ref(storage, path);
  const snapshot = await uploadBytes(storageRef, archivo);
  const url = await getDownloadURL(snapshot.ref);
  return url;
}

// -------- PUBLICAR NUEVO LIBRO DIGITAL --------
export async function publicarLibroDigital({
  titulo,
  autor,
  materia,
  descripcion,
  urlArchivo,
  urlPortada,
  urlDrive,
  anio,
  fecha,
  usuario,
}) {
  const col = collection(db, "biblioteca");
  await addDoc(col, {
    titulo: titulo || "",
    autor: autor || "",
    materia: materia || "",
    descripcion: descripcion || "",
    urlArchivo: urlArchivo || "",
    urlPortada: urlPortada || "",
    urlDrive: urlDrive || "",
    anio: anio ? Number(anio) : null,
    fecha: fecha || Timestamp.now(),
    usuario: usuario
      ? typeof usuario === "object"
        ? { uid: usuario.uid, email: usuario.email }
        : usuario
      : null,
  });
}

// -------- LISTAR LIBROS DIGITALES (FECHA DESCENDENTE) --------
export async function obtenerLibrosDigitales() {
  const q = query(collection(db, "biblioteca"), orderBy("fecha", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

// -------- BÚSQUEDA AVANZADA (materia, autor, año) --------
export async function buscarLibrosAvanzado({ materia, autor, año }) {
  let qBase = collection(db, "biblioteca");
  let filtros = [];

  if (materia) filtros.push(where("materia", "==", materia.trim()));
  if (autor) filtros.push(where("autor", "==", autor.trim()));
  if (año) filtros.push(where("anio", "==", Number(año)));

  let consulta = filtros.length
    ? query(qBase, ...filtros, orderBy("fecha", "desc"))
    : query(qBase, orderBy("fecha", "desc"));

  const snap = await getDocs(consulta);
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

// -------- EDITAR LIBRO --------
export async function editarLibroDigital(id, nuevosDatos) {
  const refLibro = doc(db, "biblioteca", id);
  await updateDoc(refLibro, nuevosDatos);
}

// -------- ELIMINAR LIBRO Y ARCHIVOS ASOCIADOS --------
export async function eliminarLibroDigital(id, urlArchivo, urlPortada) {
  const refLibro = doc(db, "biblioteca", id);
  await deleteDoc(refLibro);

  // Elimina archivos en storage si existen
  try {
    if (urlArchivo) {
      const archivoRef = ref(storage, urlArchivo.replace(/^https:\/\/[^/]+\/o\//, '').split('?')[0]);
      await deleteObject(archivoRef);
    }
    if (urlPortada) {
      const portadaRef = ref(storage, urlPortada.replace(/^https:\/\/[^/]+\/o\//, '').split('?')[0]);
      await deleteObject(portadaRef);
    }
  } catch (e) {
    console.warn("No se pudo eliminar algún archivo de Storage:", e);
  }
}

// -------- PAGINACIÓN (opcional) --------
export async function obtenerLibrosPaginados(ultimoLibro = null, pageSize = 10) {
  let q = query(
    collection(db, "biblioteca"),
    orderBy("fecha", "desc"),
    limit(pageSize)
  );
  if (ultimoLibro) {
    q = query(
      collection(db, "biblioteca"),
      orderBy("fecha", "desc"),
      startAfter(ultimoLibro.fecha),
      limit(pageSize)
    );
  }
  const snap = await getDocs(q);
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}
