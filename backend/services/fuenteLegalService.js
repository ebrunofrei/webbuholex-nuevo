// services/fuenteLegalService.js

import firestore from "./firebaseAdmin.js";

// Busca fuentes legales desde Firestore (colección 'fuentes_legales')
export async function buscarFuentesLegales(consulta) {
  if (!consulta || typeof consulta !== "string") return [];

  const snapshot = await firestore
    .collection("fuentes_legales")
    .where("keywords", "array-contains-any", consulta.toLowerCase().split(" "))
    .limit(10)
    .get();

  if (snapshot.empty) return [];

  return snapshot.docs.map(doc => {
    const data = doc.data();
    return {
      titulo: data.titulo || "",
      url: data.url || "",
      fuente: data.fuente || "Desconocida"
    };
  });
}
