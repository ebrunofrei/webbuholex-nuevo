// backend/api/notificaciones.js
import admin from "firebase-admin";

// =============================
//  Cargar credenciales Firebase
// =============================
let serviceAccount = null;

// 🔹 Producción (Vercel) → desde variable de entorno
if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  try {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  } catch (err) {
    console.error("❌ Error parseando FIREBASE_SERVICE_ACCOUNT:", err);
  }
}

// 🔹 Desarrollo local → usa el archivo físico
if (!serviceAccount) {
  try {
    serviceAccount = (
      await import("../keys/buholex-service-account.json", {
        assert: { type: "json" },
      })
    ).default;
  } catch (err) {
    console.error("⚠️ No se pudo cargar el archivo local de credenciales:", err);
  }
}

// 🔹 Inicializa Firebase Admin solo una vez
if (!admin.apps.length && serviceAccount) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

/**
 * Endpoint para enviar notificación push con FCM
 * @param {string} tokenDestino - Token FCM del cliente
 * @param {string} titulo - Título de la notificación
 * @param {string} cuerpo - Cuerpo de la notificación
 */
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método no permitido" });
  }

  try {
    const { tokenDestino, titulo, cuerpo } = req.body;

    if (!tokenDestino) {
      return res.status(400).json({ error: "Falta tokenDestino" });
    }

    const message = {
      token: tokenDestino,
      notification: {
        title: titulo || "BúhoLex",
        body: cuerpo || "Tienes una nueva notificación",
      },
    };

    const response = await admin.messaging().send(message);
    console.log("✅ Notificación enviada:", response);

    return res.status(200).json({ ok: true, response });
  } catch (error) {
    console.error("❌ Error enviando notificación:", error);
    return res
      .status(500)
      .json({ error: "No se pudo enviar la notificación" });
  }
}
