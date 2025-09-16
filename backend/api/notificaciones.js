// backend/api/notificaciones.js
import { getMessaging } from "firebase-admin/messaging";
import { admin } from "../services/firebaseAdmin.js";

/**
 * Endpoint para enviar notificación push con FCM
 * @param {string} tokenDestino - Token FCM del cliente
 * @param {string} titulo - Título de la notificación
 * @param {string} cuerpo - Cuerpo de la notificación
 */
export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
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
      android: { priority: "high" },
      apns: { headers: { "apns-priority": "10" } },
    };

    const response = await getMessaging(admin).send(message);
    console.log("✅ Notificación enviada:", response);

    return res.status(200).json({ ok: true, response });
  } catch (error) {
    console.error("❌ Error enviando notificación:", error);
    return res.status(500).json({
      error: error.message || "No se pudo enviar la notificación",
    });
  }
}
