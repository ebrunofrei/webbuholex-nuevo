// /api/ai.js
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req, res) {
  const { action } = req.query;

  if (req.method === "POST" && action === "chat") {
    try {
      const { prompt, historial } = req.body;

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini", // o el modelo que uses
        messages: [
          {
            role: "system",
            content:
              "Eres LitisBot, un asistente legal que siempre responde en español, de manera clara, profesional y confiable.",
          },
          ...(historial || []),
          { role: "user", content: prompt },
        ],
      });

      res.status(200).json({ respuesta: completion.choices[0].message.content });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  } else {
    res.status(404).json({ error: "Acción no soportada en AI" });
  }
}
