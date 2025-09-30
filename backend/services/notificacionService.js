// backend/services/notificacionService.js
import { getMessaging } from "firebase-admin/messaging";

/**
 * 📌 Servicio: enviar notificación push con FCM
 * @param {string} token - Token de destino (obligatorio)
 * @param {string} titulo - Título de la notificación (opcional, default: "BúhoLex")
 * @param {string} cuerpo - Cuerpo del mensaje (opcional, default: "Tienes una nueva notificación")
 * @param {object} data - Payload adicional (opcional)
 * @returns {Promise<string>} responseId - ID de la notificación enviada
 */
export async function sendNotification(token, titulo, cuerpo, data = {}) {
  if (!token || typeof token !== "string") {
    throw new Error("❌ Token de destino requerido y debe ser string.");
  }

  const message = {
    token,
    notification: {
      title: titulo?.trim() || "BúhoLex",
      body: cuerpo?.trim() || "Tienes una nueva notificación",
    },
    data: typeof data === "object" ? data : {},
    android: { priority: "high" },
    apns: { headers: { "apns-priority": "10" } },
  };

  try {
    const response = await getMessaging().send(message);
    console.log(`✅ Notificación enviada a ${token}:`, response);
    return response;
  } catch (err) {
    console.error("❌ Error enviando notificación con FCM:", err.message);
    throw err;
  }
}
