import { callOpenAI } from "../backend/services/openaiService.js";
import { db } from "../backend/services/firebaseAdmin.js";

export default async function handler(req, res) {
  try {
    const { pregunta, prompt, userId } = req.body || {};

    const texto = pregunta || prompt;
    if (!texto) {
      return res.status(400).json({ error: "Falta el campo 'pregunta' o 'prompt'" });
    }

    // --- Generar respuesta con OpenAI ---
    const respuesta = await callOpenAI([
      { role: "user", content: texto }
    ]);

    // --- Guardar en Firestore ---
    await db.collection("conversaciones").add({
      userId: userId || "anonimo",
      pregunta: texto,
      respuesta,
      timestamp: new Date(),
    });

    return res.status(200).json({ respuesta });
  } catch (error) {
    console.error("Error en /api/ia-litisbotchat:", error);
    return res.status(500).json({ error: error.message });
  }
}
