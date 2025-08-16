import { db } from "./firebaseConfig";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";

/**
 * Guarda la consulta de LitisBot en la colección 'consultas'
 * @param {Object} params { pregunta, respuesta, usuarioId, tipo, expedienteId }
 * @returns {Promise}
 */
export async function guardarConsulta({
  pregunta,
  respuesta,
  usuarioId = null,
  tipo = "general",
  expedienteId = null,
}) {
  return addDoc(collection(db, "consultas"), {
    pregunta,
    respuesta,
    usuarioId,
    tipo,
    expedienteId,
    fecha: serverTimestamp(),
  });
}
