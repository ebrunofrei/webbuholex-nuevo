import { openai } from "../../services/openaiService.js";
import { db } from "../../services/firebaseAdmin.js";

export default async function handler(req, res) {
  try {
    const { prompt, pregunta, userId } = req.body;
    const texto = prompt || pregunta; // acepta ambos campos

    if (!texto) {
      return res
        .status(400)
        .json({ error: "Falta el campo 'prompt' o 'pregunta'" });
    }

    // --- Generar respuesta con OpenAI ---
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: texto }],
    });

    const respuesta = completion.choices[0].message.content;

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
