import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*"); // cámbialo por tu dominio en prod
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,POST");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method === "POST") {
    try {
      const { messages, model } = req.body;

      if (!messages || !Array.isArray(messages)) {
        return res.status(400).json({ error: "Formato inválido: se requiere 'messages' como array" });
      }

      const completion = await openai.chat.completions.create({
        model: model || "gpt-4o-mini",
        messages,
      });

      return res.status(200).json({
        ok: true,
        data: completion.choices[0].message,
      });
    } catch (error) {
      console.error("Error en OpenAI handler:", error);
      return res.status(500).json({ error: error.message });
    }
  }

  return res.status(405).json({ error: "Method Not Allowed" });
}
