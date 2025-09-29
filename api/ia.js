// api/ia.js
import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req, res) {
  // Solo acepta POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { prompt, historial, usuarioId, userEmail, materia, modo, idioma } = req.body;

    // Construir contexto con historial
    const messages = [
      { role: "system", content: "Eres LitisBot, un asistente legal confiable en español." },
      ...(historial || []),
      { role: "user", content: prompt },
    ];

    // Llamada a OpenAI
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini", // usa el modelo que tengas habilitado
      messages,
    });

    const respuesta = completion.choices[0].message.content;

    return res.status(200).json({ respuesta });
  } catch (error) {
    console.error("❌ Error en /api/ia:", error);
    return res.status(500).json({ error: "Error interno en IA" });
  }
}
