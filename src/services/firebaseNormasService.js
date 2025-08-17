// src/services/firebaseNormasService.js

import { db } from "./firebaseConfig";
import { collection, query, where, getDocs } from "firebase/firestore";

// Búsqueda general por palabra clave en normas (leyes, decretos, jurisprudencia)
export async function buscarNormas({ palabraClave, fuente, tipo }) {
  let ref = collection(db, "normas_eleperuano"); // Cambia nombre de colección si usas otro
  let q = query(ref);

  // Si filtras por fuente o tipo
  if (fuente) {
    q = query(ref, where("fuente", "==", fuente));
  }
  if (tipo) {
    q = query(ref, where("tipo", "==", tipo));
  }

  const snap = await getDocs(q);
  // Búsqueda por palabra clave en título o contenido
  const res = [];
  snap.forEach(doc => {
    const data = doc.data();
    if (
      (!palabraClave ||
        (data.titulo && data.titulo.toLowerCase().includes(palabraClave.toLowerCase())) ||
        (data.contenido && data.contenido.toLowerCase().includes(palabraClave.toLowerCase()))
      )
    ) {
      res.push({ id: doc.id, ...data });
    }
  });
  return res;
}
