// /api/ai.js
import OpenAI from "openai";

/** Util: leer JSON aunque Vercel no lo haya parseado */
async function readJson(req) {
  if (req.body && typeof req.body === "object") return req.body;
  const raw = await new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (c) => (data += c));
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
  try { return raw ? JSON.parse(raw) : {}; } catch { return {}; }
}

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export default async function handler(req, res) {
  // CORS básico
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(204).end();

  // Leer 'action' de forma robusta (query o URL)
  const url = new URL(req.url, `http://${req.headers.host}`);
  const action =
    (req.query && req.query.action) ||
    url.searchParams.get("action") ||
    "";

  if (req.method === "POST" && action.toLowerCase() === "chat") {
    try {
      const body = await readJson(req);
      const { prompt, historial } = body;

      if (!prompt) {
        return res.status(400).json({ error: "Falta 'prompt' en el body" });
      }

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          ...(Array.isArray(historial) ? historial : []),
          { role: "user", content: prompt },
        ],
      });

      return res
        .status(200)
        .json({ respuesta: completion.choices?.[0]?.message?.content ?? "" });
    } catch (err) {
      console.error("AI error:", err);
      return res.status(500).json({ error: String(err.message || err) });
    }
  }

  // Debug útil cuando caes aquí
  return res
    .status(404)
    .json({ error: "Acción no soportada en AI", debug: { method: req.method, action } });
}
