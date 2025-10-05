import axios from "axios";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Cliente Axios dinámico que siempre lee la API key actual del entorno.
 */
function getOpenAIClient() {
  const API_KEY = process.env.OPENAI_API_KEY;
  if (!API_KEY) {
    throw new Error("Falta configurar OPENAI_API_KEY en el entorno");
  }

  return axios.create({
    baseURL: "https://api.openai.com/v1",
    timeout: 25000,
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
    },
  });
}

/**
 * Llama al endpoint de Chat Completions de OpenAI.
 * @param {Array<{role:'system'|'user'|'assistant', content:string}>} messages
 * @param {{model?:string, max_tokens?:number, temperature?:number}} [opts]
 * @returns {Promise<{text: string, raw: any}>}
 */
export async function callOpenAI(
  messages,
  { model = "gpt-4o-mini", max_tokens = 1024, temperature = 0.3 } = {}
) {
  if (!Array.isArray(messages) || messages.length === 0) {
    throw new Error("El parámetro 'messages' debe ser un array con al menos un mensaje.");
  }

  const client = getOpenAIClient();
  const payload = { model, messages, max_tokens, temperature };

  let lastErr;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const { data } = await client.post("/chat/completions", payload);
      const text = data?.choices?.[0]?.message?.content ?? "";
      return { text, raw: data };
    } catch (err) {
      lastErr = err;
      const status = err?.response?.status;

      if (status === 429 || (status >= 500 && status < 600)) {
        await sleep(400 * (attempt + 1));
        continue;
      }

      const detail = err?.response?.data || err.message || "Error desconocido";
      throw new Error(
        typeof detail === "string" ? detail : JSON.stringify(detail)
      );
    }
  }

  const status = lastErr?.response?.status ?? "unknown";
  const body = lastErr?.response?.data ?? lastErr?.message ?? "Error desconocido";
  throw new Error(
    `OpenAI error (status ${status}): ${
      typeof body === "string" ? body : JSON.stringify(body)
    }`
  );
}
