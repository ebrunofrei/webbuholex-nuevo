// /utils/openai.js

import OpenAI from "openai";
import pdfParse from "pdf-parse";
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function getSummaryFromOpenAI(buffer, nombre, tipo) {
  let texto = "";

  if (tipo.includes("pdf")) {
    const data = await pdfParse(buffer);
    texto = data.text;
  } else if (tipo.includes("text") || tipo.includes("plain")) {
    texto = buffer.toString("utf8");
  } else {
    texto = "[Tipo de archivo no soportado para resumen automático]";
  }

  // Prompt para OpenAI
  const prompt = `Haz un resumen jurídico profesional, claro y técnico del siguiente documento:\n\n${texto.slice(0, 8000)}`;

  const completion = await openai.chat.completions.create({
    messages: [{ role: "user", content: prompt }],
    model: "gpt-4o", // Cambia según tu cuenta
    max_tokens: 800,
  });

  return completion.choices[0].message.content.trim();
}
