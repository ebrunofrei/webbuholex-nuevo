import OpenAI from "openai";
import { getApps, initializeApp, applicationDefault, cert } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

// Inicializa OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Inicializa Firebase solo una vez
if (!getApps().length) {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
    initializeApp({ credential: cert(serviceAccount) });
  } else {
    initializeApp({ credential: applicationDefault() });
  }
}

const db = getFirestore();

export default async function handler(req, res) {
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

    const messages = [
      ...historial
        .filter(m => m?.role && m?.content)
        .map(m => ({ role: m.role, content: m.content })),
      { role: "user", content: prompt },
    ];

    const ai = await openai.chat.completions.create({
      model: "gpt-4o",
      messages,
      temperature: 0.4,
      max_tokens: 800,
    });

    const respuesta = ai?.choices?.[0]?.message?.content?.trim() ?? "Sin respuesta del modelo.";

    // Guardar en Firestore (sin bloquear respuesta)
    db.collection("litisbot_conversaciones")
      .doc(userId)
      .collection("mensajes")
      .add({
        pregunta: prompt,
        respuesta,
        historial,
        model: ai?.model || "gpt-4o",
        createdAt: FieldValue.serverTimestamp(),
      })
      .catch(e => console.warn("⚠️ No se pudo guardar en Firestore:", e?.message));

    return res.status(200).json({ respuesta });
  } catch (e) {
    console.error("❌ Error en ia-litisbotchat:", e?.message || e);
    return res.status(500).json({ error: e?.message || "Error interno" });
  }
}
