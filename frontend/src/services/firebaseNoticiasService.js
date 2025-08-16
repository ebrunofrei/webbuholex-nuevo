// src/services/firebaseNoticiasService.js
import { db } from "@/firebase";
import { collection, query, orderBy, limit, getDocs, where } from "firebase/firestore";

/**
 * obtenerNoticias({ max, soloLibres, tags, ids })
 * - max: máx. cantidad
 * - soloLibres: solo noticias libres
 * - tags: filtra por intereses
 * - ids: filtra por IDs (ej: guardadas)
 */
export async function obtenerNoticias({ max = 30, soloLibres = false, tags = [], ids = [] } = {}) {
  let ref = collection(db, "noticiasJuridicas");
  let constraints = [orderBy("fecha", "desc")];
  if (max) constraints.push(limit(max));
  if (soloLibres) constraints.push(where("premium", "==", false));
  const q = query(ref, ...constraints);
  const snap = await getDocs(q);
  let noticias = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  // Filtros extra:
  if (tags?.length)
    noticias = noticias.filter(n =>
      n.tagsAI && n.tagsAI.some(tag => tags.includes(tag))
    );
  if (ids?.length)
    noticias = noticias.filter(n => ids.includes(n.id));
  return noticias;
}
