// src/services/firebaseCodigosService.js
import { getFirestore, collection, getDocs, query, orderBy } from "firebase/firestore";
import { firebaseApp } from "@/firebase"; // Ajusta la ruta según tu estructura real

const db = getFirestore(firebaseApp);

/**
 * Obtiene la lista de códigos legales (metadatos).
 * @returns {Promise<Array>} Lista de códigos [{ id, ...data }]
 */
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

/**
 * Obtiene los artículos de un código legal por su ID.
 * @param {string} codigoId - ID del código legal en Firestore
 * @returns {Promise<Array>} Lista de artículos [{ id, ...data }]
 */
export async function obtenerArticulosPorCodigo(codigoId) {
  try {
    const q = query(
      collection(db, "codigos", codigoId, "articulos"),
      orderBy("numero", "asc")
    );
    const articulosSnapshot = await getDocs(q);
    return articulosSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error(`Error al obtener artículos para código ${codigoId}:`, error);
    return [];
  }
}
