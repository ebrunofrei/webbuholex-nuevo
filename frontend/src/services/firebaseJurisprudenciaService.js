// src/services/firebaseJurisprudenciaService.js
import { collection, getDocs } from "firebase/firestore";
import { db } from "./firebaseConfig";

export const obtenerJurisprudencia = async () => {
  const ref = collection(db, "jurisprudencia");
  const snapshot = await getDocs(ref);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};
