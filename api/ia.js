// /api/ia.js
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export default async function handler(req, res) {
  // CORS / preflight
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST,GET,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    return res.status(204).end();
  }
  res.setHeader("Access-Control-Allow-Origin", "*");

  // Permitimos GET informativo (evita 405 confusos)
  if (req.method === "GET") {
    return res
      .status(200)
      .json({ ok: true, info: "IA listo. Use POST con { prompt, historial }" });
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST,GET,OPTIONS");
    return res.status(405).json({ error: "Use POST" });
  }

  try {
    const action = (req.query?.action || "chat").toString();

    // ⛳️ AQUÍ estaba el bug:
    if (action !== "chat") {
      return res.status(400).json({ error: "Acción no soportada" });
    }

    // Parse body seguro
    let body = req.body;
    if (typeof body === "string") {
      try { body = JSON.parse(body); } catch { body = {}; }
    }
    const { prompt, historial = [] } = body || {};

    if (!prompt) return res.status(400).json({ error: "Falta 'prompt'" });
    if (!process.env.OPENAI_API_KEY)
      return res.status(500).json({ error: "OPENAI_API_KEY no configurada" });

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "Eres LitisBot, asistente legal en español, claro y confiable." },
        ...historial.map((m) => ({ role: m.role, content: m.content })),
        { role: "user", content: prompt },
      ],
    });

    const respuesta = completion.choices?.[0]?.message?.content || "Sin respuesta.";
    return res.status(200).json({ respuesta });
  } catch (err) {
    console.error("❌ /api/ia error:", err);
    return res.status(500).json({ error: err.message || "Error en IA" });
  }
}
