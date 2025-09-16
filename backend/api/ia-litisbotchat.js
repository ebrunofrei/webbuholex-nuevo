// /api/ia-litisbotchat.js
import { getFirestore } from "firebase-admin/firestore";
import { initializeApp, applicationDefault, getApps } from "firebase-admin/app";
import OpenAI from "openai";

// --- Inicializar Firebase Admin ---
if (!getApps().length) {
  initializeApp({
    credential: applicationDefault(),
  });
}
const db = getFirestore();

// --- Inicializar OpenAI ---
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// --- Handler Vercel ---
export default async function handler(req, res) {
  // Configuración CORS
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET,OPTIONS,PATCH,DELETE,POST,PUT"
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version"
  );

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  try {
    const { pregunta, userId } = req.body;

    if (!pregunta) {
      return res.status(400).json({ error: "Falta el campo 'pregunta'" });
    }

    // --- Generar respuesta con OpenAI ---
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: pregunta }],
    });

    const respuesta = completion.choices[0].message.content;

    // --- Guardar en Firestore ---
    await db.collection("conversaciones").add({
      userId: userId || "anonimo",
      pregunta,
      respuesta,
      timestamp: new Date(),
    });

    return res.status(200).json({ respuesta });
  } catch (error) {
    console.error("Error en /api/ia-litisbotchat:", error);
    return res.status(500).json({ error: error.message });
  }
}
