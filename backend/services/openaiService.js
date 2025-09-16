import { db, auth, admin } from "./firebaseAdmin.js";
import axios from "axios";

/**
 * Llama al endpoint de OpenAI Chat Completion.
 * @param {Array} messages - Mensajes del chat [{ role: "user", content: "..." }]
 * @returns {Promise<string>} Respuesta generada por OpenAI
 */
export async function callOpenAI(messages) {
  const apiKey = process.env.OPENAI_API_KEY; // 🔑 Asegúrate que en Vercel sea OPENAI_API_KEY

  if (!apiKey) {
    throw new Error("Falta configurar la variable OPENAI_API_KEY en el entorno");
  }

  const resp = await axios.post(
    "https://api.openai.com/v1/chat/completions",
    {
      model: "gpt-4o", // o gpt-4o-mini si quieres ahorrar tokens
      messages,
      max_tokens: 1024,
      temperature: 0.3,
    },
    {
      headers: { Authorization: `Bearer ${apiKey}` },
    }
  );

  return resp.data.choices[0].message.content;
}
