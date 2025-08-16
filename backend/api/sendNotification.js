import admin from "firebase-admin";
import serviceAccount from "./firebase-service-account.json"; // Tu JSON de FCM

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).send("Método no permitido");
  const { titulo, cuerpo, token } = req.body;
  try {
    await admin.messaging().send({
      token,
      notification: {
        title: titulo,
        body: cuerpo,
      },
      android: { priority: "high" },
      apns: { headers: { "apns-priority": "10" } },
    });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
