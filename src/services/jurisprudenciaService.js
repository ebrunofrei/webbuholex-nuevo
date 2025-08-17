// src/services/jurisprudenciaService.js
import { db } from "./firebaseConfig"; // Ajusta la ruta si usas otra
import { collection, getDocs } from "firebase/firestore";

export async function getJurisprudencia() {
  const querySnapshot = await getDocs(collection(db, "jurisprudencia"));
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}
