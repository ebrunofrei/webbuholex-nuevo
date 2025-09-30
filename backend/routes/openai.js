import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * 📌 Endpoint: Chat con OpenAI
 * Body esperado:
 * {
 *   messages: [{ role: "user"|"assistant"|"system", content: string }],
 *   model?: string
 * }
 */
export default async function handler(req, res) {
  // --- CORS ---
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,POST");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res
      .status(405)
      .json({ success: false, error: "Method Not Allowed" });
  }

  try {
    const { messages, model } = req.body || {};

    // --- Validaciones ---
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({
        success: false,
        error: "Formato inválido: se requiere 'messages' como array no vacío.",
      });
    }

    // --- Llamada a OpenAI ---
    const completion = await openai.chat.completions.create({
      model: model || "gpt-4o-mini",
      messages,
      max_tokens: 800,
    });

    const answer =
      completion.choices?.[0]?.message ?? {
        role: "assistant",
        content: "No se obtuvo respuesta.",
      };

    return res.status(200).json({
      success: true,
      data: answer,
    });
  } catch (error) {
    console.error("❌ Error en OpenAI handler:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Error procesando la solicitud con IA.",
    });
  }
}
