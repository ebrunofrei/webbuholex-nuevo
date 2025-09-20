// /api/ia-litisbotchat.js
import { db } from "../services/firebaseAdmin.js";
import { openai } from "../services/openaiService.js";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" });

  try {
    const body = req.body || {};
    const { model = "gpt-4o-mini", userId = "anonimo" } = body;

    let messages = [];
    if (Array.isArray(body.messages) && body.messages.length) {
      messages = body.messages;
    } else if (typeof body.pregunta === "string" && body.pregunta.trim()) {
      messages = [{ role: "user", content: body.pregunta.trim() }];
    } else {
      return res.status(400).json({ error: "Envía 'messages' (array) o 'pregunta' (string)." });
    }

    let completion;
    if (openai?.chat?.completions?.create) {
      completion = await openai.chat.completions.create({ model, messages });
    } else {
      const r = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
        },
        body: JSON.stringify({ model, messages })
      });
      const j = await r.json();
      if (!r.ok) return res.status(502).json({ error: j });
      completion = j;
    }

    const answer = completion.choices?.[0]?.message ?? { role: "assistant", content: "" };
    const text = answer.content || "";

    try {
      if (db) {
        await db.collection("conversaciones").add({
          userId, model, messages, respuesta: text, createdAt: new Date()
        });
      }
    } catch (e) {
      console.warn("No se pudo guardar en Firestore:", e?.message || e);
    }

    return res.status(200).json({ data: answer });
  } catch (error) {
    console.error("Error en /api/ia-litisbotchat:", error);
    return res.status(500).json({ error: "Error generando respuesta del asistente." });
  }
}
