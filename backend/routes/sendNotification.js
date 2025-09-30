// api/notificaciones.js
import { getMessaging } from "firebase-admin/messaging";
import { db } from "#services/myFirebaseAdmin.js";

/**
 * 📢 Handler para enviar notificaciones push vía FCM
 * Body esperado:
 * {
 *   token: string,
 *   titulo: string,
 *   cuerpo: string,
 *   data?: object
 * }
 */
export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({
      success: false,
      error: "Método no permitido",
    });
  }

  try {
    const { token, titulo, cuerpo, data } = req.body || {};

    // --- Validaciones ---
    if (!token || !titulo || !cuerpo) {
      return res.status(400).json({
        success: false,
        error: "Faltan parámetros obligatorios: token, titulo o cuerpo.",
      });
    }

    const message = {
      token,
      notification: {
        title: titulo.trim(),
        body: cuerpo.trim(),
      },
      data: data || {}, // datos adicionales opcionales
      android: { priority: "high" },
      apns: { headers: { "apns-priority": "10" } },
    };

    // --- Enviar notificación ---
    const response = await getMessaging().send(message);
    console.log("✅ Notificación enviada:", response);

    // --- Guardar log en Firestore ---
    try {
      await db.collection("notificaciones").add({
        token,
        titulo,
        cuerpo,
        data: data || {},
        enviadaEn: new Date(),
        resultado: response,
      });
    } catch (e) {
      console.warn("⚠️ No se pudo guardar log de notificación:", e.message);
    }

    return res.status(200).json({
      success: true,
      msg: "✅ Notificación enviada correctamente.",
      response,
    });
  } catch (e) {
    console.error("❌ Error enviando notificación:", e);
    return res.status(500).json({
      success: false,
      error: e.message || "Error enviando notificación.",
    });
  }
}
