import { getApps, initializeApp, cert } from "firebase-admin/app";
import { getMessaging } from "firebase-admin/messaging";

// --- Inicializa Firebase Admin solo una vez ---
if (!getApps().length) {
  if (!process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    throw new Error("❌ Falta la variable FIREBASE_SERVICE_ACCOUNT_JSON en el entorno");
  }

  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);

  initializeApp({
    credential: cert(serviceAccount),
  });
}

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

    const messaging = getMessaging();
    await messaging.send({
      token,
      notification: {
        title: titulo,
        body: cuerpo,
      },
      android: { priority: "high" },
      apns: { headers: { "apns-priority": "10" } },
    });

    return res.json({ ok: true });
  } catch (e) {
    console.error("❌ Error enviando notificación:", e.message);
    return res.status(500).json({ error: e.message });
  }
}
