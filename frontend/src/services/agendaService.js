// src/services/agendaService.js

// Si usas Firestore:
import { db } from "./firebaseConfig"; // o tu archivo de firebase
import { collection, query, where, getDocs } from "firebase/firestore";

// Corrige el nombre de la colección, campos y usuarioId según tu modelo

export async function obtenerAgendaHoy(usuarioId) {
  const hoy = new Date();
  hoy.setHours(0,0,0,0);
  const q = query(
    collection(db, "agenda"),
    where("usuarioId", "==", usuarioId),
    where("fecha", ">=", hoy)
  );
  const snap = await getDocs(q);
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}
