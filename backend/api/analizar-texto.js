import { OpenAI } from "openai";
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ success: false, message: "Method not allowed" });
    return;
  }
  try {
    const { texto } = req.body;
    if (!texto || texto.length < 3)
      throw new Error("Texto insuficiente para analizar.");

    const completion = await openai.chat.completions.create({
      messages: [{ role: "user", content: texto.slice(0, 8000) }],
      model: "gpt-4o",
      max_tokens: 800,
    });
    const resultado = completion.choices[0].message.content.trim();
    res.status(200).json({ success: true, resultado });
  } catch (error) {
    res.status(500).json({ success: false, resultado: "Error en IA." });
  }
}
