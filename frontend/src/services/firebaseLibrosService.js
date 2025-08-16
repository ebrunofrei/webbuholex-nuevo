// src/services/firebaseLibrosService.js
import { collection, getDocs } from "firebase/firestore";
import { db } from "./firebaseConfig.js";

// Obtiene todos los libros de la colección "biblioteca"
export async function obtenerLibros() {
  try {
    const librosRef = collection(db, "biblioteca");
    const snapshot = await getDocs(librosRef);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error("Error al obtener libros:", error);
    return [];
  }
}
