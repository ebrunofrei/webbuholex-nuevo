// src/services/expedientesService.js
import { db } from "./firebaseConfig"; // O el archivo donde inicializas tu instancia de Firestore
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";

// Devuelve expedientes activos del usuario
export async function obtenerExpedientesActivos(usuarioId) {
  const expedientesRef = collection(db, "expedientes");
  const q = query(expedientesRef, 
    where("usuarioId", "==", usuarioId),
    where("estado", "==", "activo")
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
}

// Devuelve las últimas resoluciones vinculadas a expedientes del usuario
export async function obtenerResolucionesRecientes(usuarioId, limite = 5) {
  const resolucionesRef = collection(db, "resoluciones");
  const q = query(resolucionesRef, 
    where("usuarioId", "==", usuarioId),
    orderBy("fecha", "desc")
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.slice(0, limite).map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
}
