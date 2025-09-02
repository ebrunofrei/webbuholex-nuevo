import { db, auth, storage } from "@/firebase";

// src/services/firebaseJurisprudenciaService.jsimport { collection, getDocs } from "@/firebase";export const obtenerJurisprudencia = async () => {  const ref = collection(db, "jurisprudencia");  const snapshot = await getDocs(ref);  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));};