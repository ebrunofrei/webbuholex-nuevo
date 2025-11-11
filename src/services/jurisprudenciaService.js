import { db, auth, storage } from "@/firebase";

// src/services/jurisprudenciaService.js
 // Ajusta la ruta si usas otra
import { collection, getDocs } from "@/firebase";
export async function getJurisprudencia() {
  const querySnapshot = await getDocs(collection(db, "jurisprudencia"));
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}
