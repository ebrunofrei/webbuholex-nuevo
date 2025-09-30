// backend/api/notificaciones.js
import { getMessaging } from "firebase-admin/messaging";
import { db } from "#services/myFirebaseAdmin.js";
import { sendNotification } from "#services/notificacionService.js";

/**
 * 📢 Endpoint: Enviar notificación push vía FCM
 * Body esperado:
 * {
 *   tokenDestino: string (obligatorio),
 *   titulo?: string,
 *   cuerpo?: string,
 *   data?: object (opcional para payload adicional)
 * }
 */
export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res
      .status(405)
      .json({ success: false, error: "Método no permitido" });
  }

  try {
    const { tokenDestino, titulo, cuerpo, data } = req.body || {};

    // --- Validación ---
    if (!tokenDestino || typeof tokenDestino !== "string") {
      return res.status(400).json({
        success: false,
        error: "El campo 'tokenDestino' es obligatorio y debe ser string.",
      });
    }

    // --- Enviar notificación (usando servicio centralizado) ---
    const response = await sendNotification(tokenDestino, titulo, cuerpo, data);
    console.log("✅ Notificación enviada:", response);

    // --- Guardar log en Firestore ---
    try {
      await db.collection("notificaciones").add({
        tokenDestino,
        titulo: titulo?.trim() || "BúhoLex",
        cuerpo: cuerpo?.trim() || "Tienes una nueva notificación",
        data: data || {},
        enviadaEn: new Date(),
        resultado: response,
      });
    } catch (logErr) {
      console.warn("⚠️ No se pudo guardar log de notificación:", logErr.message);
    }

    return res.status(200).json({
      success: true,
      message: "Notificación enviada correctamente.",
      response,
    });
  } catch (error) {
    console.error("❌ Error enviando notificación:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "No se pudo enviar la notificación.",
    });
  }
}
