// backend/api/ia-litisbotchat.js
import { db, auth, admin } from "../services/firebaseAdmin.js";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import OpenAI from "openai";

// --- Usa la instancia centralizada de Firebase Admin ---
const adminDb = getFirestore();

// --- Inicializa OpenAI ---
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// --- Handler para Vercel ---
export default async function handler(req, res) {
  // --- Configuración CORS ---
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*"); // ⚠️ Cambia "*" por https://www.buholex.com en producción
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,PATCH,DELETE,POST,PUT");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Authorization"
  );

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Solo se permite POST" });
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
    const { prompt, historial = [], userId = "invitado" } = body;

    if (!prompt || typeof prompt !== "string") {
      return res.status(400).json({ error: "Falta el parámetro 'prompt'." });
    }

    // --- Construir historial de conversación ---
    const messages = [
      ...historial
        .filter((m) => m?.role && m?.content)
        .map((m) => ({ role: m.role, content: m.content })),
      { role: "user", content: prompt },
    ];

    // --- Llamada a OpenAI ---
    const ai = await openai.chat.completions.create({
      model: "gpt-4o",
      messages,
      temperature: 0.4,
      max_tokens: 800,
    });

    const respuesta = ai?.choices?.[0]?.message?.content?.trim() ?? "Sin respuesta del modelo.";

    // --- Guardar en Firestore (async, no bloquea respuesta) ---
    adminDb
      .collection("litisbot_conversaciones")
      .doc(userId)
      .collection("mensajes")
      .add({
        pregunta: prompt,
        respuesta,
        historial,
        model: ai?.model || "gpt-4o",
        createdAt: FieldValue.serverTimestamp(),
      })
      .catch((e) => console.warn("⚠️ No se pudo guardar en Firestore:", e?.message));

    // --- Respuesta al cliente ---
    return res.status(200).json({ respuesta });
  } catch (e) {
    console.error("❌ Error en ia-litisbotchat:", e?.message || e);
    return res.status(500).json({ error: e?.message || "Error interno" });
  }
}
