// test-openai.js
import axios from "axios";

async function test() {
  try {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      throw new Error("❌ Falta la variable OPENAI_API_KEY en el entorno");
    }

    const resp = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: "Hola, ¿puedes responder con un texto corto de prueba?" }],
        max_tokens: 50,
      },
      {
        headers: { Authorization: `Bearer ${apiKey}` },
      }
    );

    console.log("✅ Respuesta OK:", resp.data.choices[0].message.content);
  } catch (err) {
    console.error("❌ Error:", err.response?.data || err.message);
  }
}

test();
