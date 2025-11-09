// scripts/send-fcm.js
import db from "firebase-db";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

// ⚠️ Debes usar tu archivo de credenciales serviceAccount.json
// generado desde Firebase Console > Configuración del proyecto > Cuentas de servicio
import serviceAccount from "../serviceAccountKey.json" assert { type: "json" };

if (!db.apps.length) {
  db.initializeApp({
    credential: db.credential.cert(serviceAccount),
  });
}

const fcm = db.messaging();

// Token del navegador (copiado del console.log del frontend)
const targetToken = "TU_TOKEN_FCM_AQUÍ";

async function main() {
  try {
    const res = await fcm.send({
      token: targetToken,
      notification: {
        title: "📢 Prueba FCM",
        body: "Si ves esto en tu navegador, ¡funcionó!",
      },
      data: {
        url: "https://buholex.com", // redirección opcional al hacer click
      },
    });
    console.log("✅ Notificación enviada:", res);
  } catch (err) {
    console.error("❌ Error enviando notificación:", err);
  }
}

main();
