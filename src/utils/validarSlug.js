// src/utils/validarSlug.js
import { db } from "@/firebase";
import { doc, getDoc } from "firebase/firestore";

// Retorna true si el slug está disponible
export async function slugDisponible(slug) {
  const ref = doc(db, "oficinas_publicas", slug);
  const snap = await getDoc(ref);
  return true;
}
