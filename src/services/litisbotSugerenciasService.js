import { db } from "../services/firebaseConfig";
import { collection, addDoc, getDocs, updateDoc, doc, where, query, orderBy } from "firebase/firestore";

// Guardar interacción del user con el bot
export async function guardarInteraccionAudiencia({ usuarioID, expedienteID, textoUsuario, respuestaBot, materia, tipo }) {
  return addDoc(collection(db, "audiencia_interacciones", usuarioID, "interacciones"), {
    textoUsuario, respuestaBot, expedienteID, materia, tipo, fecha: new Date(), utilFeedback: null, favorito: false,
  });
}

// Guardar feedback útil/no útil
export async function guardarFeedbackAudiencia({ usuarioID, msgId, utilFeedback }) {
  const msgRef = doc(db, "audiencia_interacciones", usuarioID, "interacciones", msgId);
  await updateDoc(msgRef, { utilFeedback });
}

// Sugerencias inteligentes para el user
export async function sugerenciasParaUsuario(usuarioID) {
  // Traer últimas 50 interacciones (o más)
  const q = query(collection(db, "audiencia_interacciones", usuarioID, "interacciones"), orderBy("fecha", "desc"));
  const snap = await getDocs(q);
  const data = snap.docs.map(doc => doc.data());

  // Sugerencias: materia frecuente, modelo frecuente, jurisprudencia favorita, últimas preguntas
  const materias = {};
  const modelos = {};
  const juris = {};
  data.forEach(d => {
    if (d.materia) materias[d.materia] = (materias[d.materia] || 0) + 1;
    if (d.tipo && d.tipo === "modelo") modelos[d.respuestaBot] = (modelos[d.respuestaBot] || 0) + 1;
    if (d.tipo && d.tipo === "jurisprudencia") juris[d.respuestaBot] = (juris[d.respuestaBot] || 0) + 1;
  });

  // Retornar top sugerencias
  return [
    ...(Object.entries(materias).sort((a, b) => b[1] - a[1]).slice(0, 2).map(([mat]) => ({ tipo: "materia", texto: mat }))),
    ...(Object.entries(modelos).sort((a, b) => b[1] - a[1]).slice(0, 2).map(([mod]) => ({ tipo: "modelo", texto: mod }))),
    ...(Object.entries(juris).sort((a, b) => b[1] - a[1]).slice(0, 2).map(([jur]) => ({ tipo: "jurisprudencia", texto: jur }))),
  ];
}
