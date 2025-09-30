import { db, auth, storage } from "#services/myFirebaseAdmin.js";
import express from "express";
import { OpenAI } from "openai";

const router = express.Router();

// Inicialización de OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * 🧑‍⚖️ Endpoint: /consulta
 * Consulta jurídica con IA (especialista en derecho peruano)
 */
router.post("/consulta", async (req, res) => {
  try {
    const { prompt } = req.body;

    if (!prompt || prompt.trim().length < 5) {
      return res.status(400).json({
        success: false,
        respuesta: "El prompt es demasiado corto o inválido.",
      });
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4o", // más rápido y económico, puedes dejar "gpt-4" si prefieres
      messages: [
        {
          role: "system",
          content:
            "Eres un abogado especialista en derecho peruano. Responde en lenguaje profesional y técnico, citando normas, jurisprudencia o doctrina cuando corresponda.",
        },
        { role: "user", content: prompt },
      ],
      max_tokens: 600,
      temperature: 0.1,
    });

    const respuesta =
      completion.choices?.[0]?.message?.content?.trim() ||
      "No se obtuvo respuesta de la IA.";

    return res.json({
      success: true,
      respuesta,
    });
  } catch (error) {
    console.error("Error en /consulta:", error);
    return res.status(500).json({
      success: false,
      respuesta: "Ocurrió un error al procesar la consulta jurídica.",
    });
  }
});

export default router;
