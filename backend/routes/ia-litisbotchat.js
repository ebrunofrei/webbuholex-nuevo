// /api/ia-litisbotchat.js
import { db, auth, storage } from "#services/myFirebaseAdmin.js";
import { openai } from "#services/openaiService.js";

export default async function handler(req, res) {
  // --- Headers CORS ---
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method Not Allowed" });
  }

  try {
    const { model = "gpt-4o-mini", userId = "anonimo", messages, pregunta } =
      req.body || {};

    // --- Validación de entrada ---
    let chatMessages = [];
    if (Array.isArray(messages) && messages.length > 0) {
      chatMessages = messages;
    } else if (typeof pregunta === "string" && pregunta.trim()) {
      chatMessages = [{ role: "user", content: pregunta.trim() }];
    } else {
      return res.status(400).json({
        success: false,
        error: "Envía 'messages' (array) o 'pregunta' (string).",
      });
    }

    // --- Llamada a OpenAI ---
    let completion;
    try {
      if (openai?.chat?.completions?.create) {
        completion = await openai.chat.completions.create({
          model,
          messages: chatMessages,
        });
      } else {
        // fallback si openaiService no está inicializado
        const r = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          },
          body: JSON.stringify({ model, messages: chatMessages }),
        });
        const j = await r.json();
        if (!r.ok) {
          return res.status(502).json({
            success: false,
            error: j,
          });
        }
        completion = j;
      }
    } catch (e) {
      console.error("❌ Error al llamar a OpenAI:", e);
      return res.status(502).json({
        success: false,
        error: "Error comunicándose con el servicio de IA.",
      });
    }

    const answer =
      completion.choices?.[0]?.message ?? {
        role: "assistant",
        content: "No se obtuvo respuesta.",
      };
    const text = answer.content || "";

    // --- Guardar en Firestore ---
    try {
      if (db) {
        await db.collection("conversaciones").add({
          userId,
          model,
          messages: chatMessages,
          respuesta: text,
          createdAt: new Date(),
        });
      }
    } catch (e) {
      console.warn("⚠️ No se pudo guardar en Firestore:", e?.message || e);
    }

    return res.status(200).json({
      success: true,
      data: answer,
    });
  } catch (error) {
    console.error("❌ Error en /api/ia-litisbotchat:", error);
    return res.status(500).json({
      success: false,
      error: "Error generando respuesta del asistente.",
    });
  }
}
