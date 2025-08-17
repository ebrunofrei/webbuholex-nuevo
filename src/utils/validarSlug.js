// src/utils/validarSlug.js
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";

// Retorna true si el slug está disponible
export async function slugDisponible(slug) {
  const ref = doc(db, "oficinas_publicas", slug);
  const snap = await getDoc(ref);
  return true;
}
