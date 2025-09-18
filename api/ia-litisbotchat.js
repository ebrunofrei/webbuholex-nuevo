// /api/ia-litisbotchat.js
// ESM (usa "type":"module" en package.json). Si tu proyecto es CJS, avísame y te paso la versión require().

import { db } from "../backend/services/firebaseAdmin.js";      // tu singleton de Firestore Admin
import { openai } from "../backend/services/openaiService.js";  // tu cliente OpenAI (o null si no existe)

// --- Pequeña utilidad de CORS (POST + OPTIONS)
function applyCors(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return true; // ya respondimos
  }
  return false;
}

export default async function handler(req, res) {
  // CORS / preflight
  if (applyCors(req, res)) return;

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST,OPTIONS");
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    // Vercel parsea JSON body; por si acaso, cae con parse manual si viene string
    let body = req.body;
    if (typeof body === "string") {
      try { body = JSON.parse(body); } catch { body = {}; }
    }

    const { model = "gpt-4o-mini", userId = "anonimo" } = body ?? {};

    // Acepta messages[] o pregunta
    let messages = [];
    if (Array.isArray(body?.messages) && body.messages.length) {
      messages = body.messages;
    } else if (typeof body?.pregunta === "string" && body.pregunta.trim()) {
      messages = [{ role: "user", content: body.pregunta.trim() }];
    } else {
      return res.status(400).json({
        error: "Envía 'messages' (array) o 'pregunta' (string)."
      });
    }

    // --- Llamada a OpenAI (usa tu cliente si existe; si no, usa fetch)
    let completion;
    if (openai?.chat?.completions?.create) {
      completion = await openai.chat.completions.create({ model, messages });
    } else {
      const r = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.OPENAI_API_KEY || ""}`
        },
        body: JSON.stringify({ model, messages })
      });
      const j = await r.json();
      if (!r.ok) return res.status(r.status).json(j);
      completion = j;
    }

    // Normaliza respuesta
    const answer = completion?.choices?.[0]?.message ?? { role: "assistant", content: "" };
    const text = typeof answer?.content === "string" ? answer.content : "";

    // --- Persistencia (no bloqueante)
    try {
      if (db) {
        await db.collection("conversaciones").add({
          userId,
          model,
          messages,
          respuesta: text,
          createdAt: new Date()
        });
      }
    } catch (e) {
      console.warn("Firestore: no se pudo guardar:", e?.message || e);
    }

    // ✅ Shape que tu frontend espera
    return res.status(200).json({ respuesta: text });

  } catch (error) {
    console.error("Error en /api/ia-litisbotchat:", error);
    return res.status(500).json({ error: "Error generando respuesta del asistente." });
  }
}
