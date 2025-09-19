// /api/ai.js
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req, res) {
  const { action } = req.query;

  try {
    if (action === "chat" && req.method === "POST") {
      // Aquí usarías la API de OpenAI
      res.json({ response: "Respuesta de la IA" });

    } else if (action === "summarize" && req.method === "POST") {
      res.json({ summary: "Resumen generado" });

    } else {
      res.status(400).json({ error: "Acción no soportada en AI" });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
