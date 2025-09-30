// backend/jobs/cronNoticias.js
import cron from "node-cron";
import { db } from "#services/myFirebaseAdmin.js";
import { getMessaging } from "firebase-admin/messaging";
import { actualizarNoticias } from "#services/noticiasService.js";
import { MongoClient } from "mongodb";

// ==========================
// Conexión MongoDB
// ==========================
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017";
const client = new MongoClient(MONGO_URI);

let mongoDb;
async function connectMongo() {
  if (!mongoDb) {
    await client.connect();
    mongoDb = client.db("legalbot");
    console.log("✅ MongoDB conectado en cronNoticias");
  }
}
await connectMongo();

// ==========================
// Función para notificar vía FCM
// ==========================
async function enviarNotificacionNoticias(totalJuridicas, totalGenerales) {
  try {
    const message = {
      topic: "noticias", // 👉 todos los usuarios suscritos al topic "noticias"
      notification: {
        title: "📰 Noticias actualizadas",
        body: `Se cargaron ${totalJuridicas} jurídicas y ${totalGenerales} generales.`,
      },
      data: {
        tipo: "noticias_update",
        juridicas: String(totalJuridicas),
        generales: String(totalGenerales),
      },
      android: { priority: "high" },
      apns: { headers: { "apns-priority": "10" } },
    };

    const response = await getMessaging().send(message);
    console.log("📩 Notificación enviada a topic 'noticias':", response);
  } catch (err) {
    console.error("❌ Error enviando notificación FCM:", err.message);
  }
}

// ==========================
// Cron job
// ==========================
function startNoticiasCron() {
  cron.schedule("0 */3 * * *", async () => {
    console.log("🕒 Ejecutando cron de noticias (jurídicas + generales)...");

    const ejecutadoEn = new Date();

    try {
      // Ejecutar en paralelo
      const [juridicas, generales] = await Promise.all([
        actualizarNoticias({ scope: "juridicas" }),
        actualizarNoticias({ scope: "generales" }),
      ]);

      console.log(
        `✅ Noticias actualizadas: Jurídicas (${juridicas.guardadas}/${juridicas.total}), Generales (${generales.guardadas}/${generales.total})`
      );

      // --- Guardar log en MongoDB ---
      try {
        await mongoDb.collection("logs_cron_noticias").insertOne({
          ejecutadoEn,
          estado: "ok",
          juridicas,
          generales,
        });
      } catch (mongoErr) {
        console.warn("⚠️ No se pudo guardar log en MongoDB:", mongoErr.message);
      }

      // --- Espejo en Firestore ---
      try {
        await db.collection("logs_cron_noticias").add({
          ejecutadoEn,
          estado: "ok",
          juridicas,
          generales,
        });
      } catch (fsErr) {
        console.warn("⚠️ No se pudo guardar log en Firestore:", fsErr.message);
      }

      // --- Enviar notificación push ---
      await enviarNotificacionNoticias(juridicas.guardadas, generales.guardadas);
    } catch (error) {
      console.error("❌ Error en cron de noticias:", error);

      // Log de error en Mongo
      try {
        await mongoDb.collection("logs_cron_noticias").insertOne({
          ejecutadoEn,
          estado: "error",
          detalle: error.message || "Error desconocido",
        });
      } catch (mongoErr) {
        console.warn("⚠️ No se pudo guardar log de error en MongoDB:", mongoErr.message);
      }

      // Log espejo en Firestore
      try {
        await db.collection("logs_cron_noticias").add({
          ejecutadoEn,
          estado: "error",
          detalle: error.message || "Error desconocido",
        });
      } catch (fsErr) {
        console.warn("⚠️ No se pudo guardar log de error en Firestore:", fsErr.message);
      }
    }
  });

  console.log("🚀 LitisBot cron job iniciado: ejecuta noticias cada 3 horas.");
}

export default startNoticiasCron;
