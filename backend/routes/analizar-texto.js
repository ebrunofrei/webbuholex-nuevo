import { db, auth, storage } from "#services/myFirebaseAdmin.js";
import { OpenAI } from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      message: "Method not allowed",
    });
  }

  try {
    const { texto } = req.body;

    // --- Validaciones ---
    if (!texto || typeof texto !== "string" || texto.trim().length < 3) {
      return res.status(400).json({
        success: false,
        resultado: "Texto insuficiente para analizar.",
      });
    }

    // --- Prompt IA ---
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      max_tokens: 800,
      messages: [
        {
          role: "user",
          content: texto.slice(0, 8000), // límite de seguridad
        },
      ],
    });

    const resultado =
      completion.choices?.[0]?.message?.content?.trim() || "Sin respuesta generada.";

    return res.status(200).json({
      success: true,
      resultado,
    });
  } catch (error) {
    console.error("Error en IA handler:", error);
    return res.status(500).json({
      success: false,
      resultado: "Ocurrió un error al procesar con IA.",
    });
  }
}
