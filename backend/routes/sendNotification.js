// api/notificaciones.js
import { getMessaging } from "firebase-admin/messaging";
import { admin } from "../services/firebaseAdmin.js";

// --- Handler para enviar notificaciones push ---
export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Método no permitido" });
  }

  try {
    const { titulo, cuerpo, token } = req.body;

    if (!token || !titulo || !cuerpo) {
      return res.status(400).json({ error: "Faltan parámetros: token, titulo o cuerpo" });
    }

    const messaging = getMessaging(admin);

    await messaging.send({
      token,
      notification: {
        title: titulo,
        body: cuerpo,
      },
      android: { priority: "high" },
      apns: { headers: { "apns-priority": "10" } },
    });

    return res.json({ ok: true, msg: "✅ Notificación enviada" });
  } catch (e) {
    console.error("❌ Error enviando notificación:", e);
    return res.status(500).json({ error: e.message });
  }
}
