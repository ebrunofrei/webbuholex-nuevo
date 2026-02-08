// backend/services/tools/translateText.js
import { getOpenAIClient } from "../openaiService.js";

export async function translateText({
  text,
  sourceLang = "auto",
  targetLang = "es",
}) {
  if (!text) return "";

  const openai = getOpenAIClient();

  const prompt = `
Traduce el siguiente texto al idioma "${targetLang}".
Mantén el significado original.
No expliques nada.
No agregues comentarios.

Texto:
"""${text}"""
`.trim();

  const res = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.2,
    messages: [{ role: "user", content: prompt }],
  });

  return res?.choices?.[0]?.message?.content?.trim() || "";
}
