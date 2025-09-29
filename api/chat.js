// api/chat.js
import OpenAI from "openai";

// Cliente OpenAI (ya configurado en tus env vars de Vercel)
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Historial en memoria (puedes reemplazarlo con Firestore)
let historial = [];

export default async function handler(req, res) {
  const { action } = req.query;

  try {
    // Enviar mensaje (llama a la IA)
    if (action === "send" && req.method === "POST") {
      const { prompt, usuarioId = "invitado", userEmail = "" } = req.body || {};

      if (!prompt) {
        return res.status(400).json({ error: "Falta el prompt" });
      }

      // Guardar mensaje de usuario
      const msgUser = { role: "user", content: prompt, usuarioId, userEmail };
      historial.push(msgUser);

      // Llamar a OpenAI
      const completion = await client.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "Eres un asistente conversacional en español. Responde de manera clara y útil." },
          ...historial.map((m) => ({ role: m.role, content: m.content })),
        ],
        temperature: 0.7,
        max_tokens: 800,
      });

      const respuesta = completion.choices[0].message.content;

      // Guardar respuesta en historial
      const msgBot = { role: "assistant", content: respuesta };
      historial.push(msgBot);

      return res.status(200).json({ respuesta, historial });
    }

    // Listar historial
    if (action === "list" && req.method === "GET") {
      return res.status(200).json({ messages: historial });
    }

    // Acción inválida
    return res.status(400).json({ error: "Acción no soportada en CHAT" });
  } catch (err) {
    console.error("❌ Error en handler /api/chat:", err);
    return res.status(500).json({ error: err.message || "Error interno en CHAT" });
  }
}
