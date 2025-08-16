import {
  collection,
  getDocs,
  query,
  orderBy,
  doc,
  updateDoc,
  deleteDoc,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/firebase"; // Ajusta si tu export de db está en otro archivo

export async function obtenerCodigos() {
  try {
    const codigosSnapshot = await getDocs(collection(db, "codigos"));
    return codigosSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error("Error al obtener códigos:", error);
    return [];
  }
}

export async function obtenerArticulosPorCodigo(codigoId) {
  try {
    const q = query(
      collection(db, "codigos", codigoId, "articulos"),
      orderBy("numero", "asc")
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        numero: typeof data.numero === "number" ? data.numero : Number(data.numero)
      };
    });
  } catch (error) {
    console.error(`Error al obtener artículos para código ${codigoId}:`, error);
    return [];
  }
}

export async function editarArticulo(codigoId, articuloId, nuevosDatos) {
  try {
    const ref = doc(db, "codigos", codigoId, "articulos", articuloId);
    await updateDoc(ref, nuevosDatos);
  } catch (error) {
    console.error(`Error al editar artículo ${articuloId} en código ${codigoId}:`, error);
    throw error;
  }
}

export async function eliminarArticulo(codigoId, articuloId) {
  try {
    const ref = doc(db, "codigos", codigoId, "articulos", articuloId);
    await deleteDoc(ref);
  } catch (error) {
    console.error(`Error al eliminar artículo ${articuloId} en código ${codigoId}:`, error);
    throw error;
  }
}

// Auditoría de cambios en artículos
export async function registrarAuditoria({ codigoId, articuloId, tipo, usuario, datosAntes, datosDespues }) {
  try {
    const ref = collection(db, "codigos", codigoId, "articulos", articuloId, "auditoria");
    await addDoc(ref, {
      tipo, // 'edicion' o 'eliminacion'
      usuario: {
        uid: usuario?.uid,
        email: usuario?.email
      },
      fecha: serverTimestamp(),
      datosAntes: datosAntes || null,
      datosDespues: datosDespues || null
    });
  } catch (error) {
    console.error("Error registrando auditoría:", error);
  }
}
