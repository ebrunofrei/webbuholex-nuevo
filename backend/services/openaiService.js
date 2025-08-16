// buholex-backend-nuevo/services/openaiService.js
import axios from "axios";

export async function callOpenAI(messages) {
  const apiKey = process.env.OPENAI_KEY;
  const resp = await axios.post(
    "https://api.openai.com/v1/chat/completions",
    {
      model: "gpt-4o", // Cambia por tu modelo
      messages,
      max_tokens: 1024,
      temperature: 0.3,
    },
    {
      headers: { Authorization: `Bearer ${apiKey}` }
    }
  );
  return resp.data.choices[0].message.content;
}
