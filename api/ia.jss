// /api/ia.js
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      res.setHeader("Allow", "POST");
      return res.status(405).json({ error: "Solo POST" });
    }

    const { action } = req.query || {};
    if (action !== "chat") {
      return res.status(404).json({ error: "Acción no soportada en AI" });
    }

    // Asegura JSON
    let body = req.body;
    if (typeof body === "string") {
      try { body = JSON.parse(body || "{}"); }
      catch { return res.status(400).json({ error: "Body inválido (JSON)" }); }
    }

    const { prompt, historial = [] } = body || {};
    if (!prompt) return res.status(400).json({ error: "Falta 'prompt' en body" });
    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ error: "OPENAI_API_KEY no configurada" });
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "Eres LitisBot, un asistente legal que siempre responde en español, de manera clara, profesional y confiable."
        },
        ...(Array.isArray(historial) ? historial : []),
        { role: "user", content: String(prompt) }
      ]
    });

    const respuesta = completion?.choices?.[0]?.message?.content ?? "";
    return res.status(200).json({ respuesta });
  } catch (err) {
    console.error("AI ERROR:", err);
    const msg =
      err?.response?.data?.error?.message ||
      err?.message ||
      "Error desconocido";
    return res.status(500).json({ error: msg });
  }
}
