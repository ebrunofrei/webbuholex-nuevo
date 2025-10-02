// backend/jobs/cronNoticias.js
import cron from "node-cron";
import { db } from "#services/myFirebaseAdmin.js";
import { actualizarNoticias } from "#services/noticiasService.js";
import admin from "firebase-admin";
import twilio from "twilio";

// =========================
// 🔔 Inicializar FCM (Firebase Admin)
// =========================
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
  });
}
const fcm = admin.messaging();

// =========================
// 📲 Inicializar Twilio (WhatsApp)
// =========================
const client = twilio(
  process.env.TWILIO_SID,
  process.env.TWILIO_TOKEN
);
const WHATSAPP_NUMBER = process.env.TWILIO_WHATSAPP_NUMBER || "whatsapp:+14155238886";

// =========================
// 📰 CRON
// =========================
export function cronNoticias() {
  cron.schedule("0 */3 * * *", async () => {
    console.log("⏳ [CronNoticias] Ejecutando actualización de noticias...");

    let nuevasGenerales = 0;
    let nuevasJuridicas = 0;

    // Generales
    try {
      const generales = await actualizarNoticias({ scope: "generales" });
      if (generales.items?.length) {
        const coll = db.collection("noticias_generales");
        let batch = db.batch();
        generales.items.forEach((n) => {
          const ref = coll.doc();
          batch.set(ref, { ...n, creadoEn: new Date() });
        });
        await batch.commit();
        nuevasGenerales = generales.total || 0;
      }
      console.log(`✅ Noticias generales actualizadas: ${generales.total || 0}`);
    } catch (err) {
      console.error("❌ Error al actualizar noticias generales:", err.message);
    }

    // Jurídicas
    try {
      const juridicas = await actualizarNoticias({ scope: "juridicas" });
      if (juridicas.items?.length) {
        const coll = db.collection("noticias_juridicas");
        let batch = db.batch();
        juridicas.items.forEach((n) => {
          const ref = coll.doc();
          batch.set(ref, { ...n, creadoEn: new Date() });
        });
        await batch.commit();
        nuevasJuridicas = juridicas.total || 0;
      }
      console.log(`✅ Noticias jurídicas actualizadas: ${juridicas.total || 0}`);
    } catch (err) {
      console.error("❌ Error al actualizar noticias jurídicas:", err.message);
    }

    // 🔔 Notificaciones si hay nuevas
    try {
      const totalNuevas = nuevasGenerales + nuevasJuridicas;
      if (totalNuevas > 0) {
        const titulo = "📰 Nuevas noticias disponibles";
        const cuerpo = `${totalNuevas} artículos nuevos (Jurídicas: ${nuevasJuridicas}, Generales: ${nuevasGenerales}).`;

        // --- FCM Push Notification ---
        await fcm.sendToTopic("noticias", {
          notification: {
            title: titulo,
            body: cuerpo,
            icon: "/favicon.ico",
            click_action: "https://buholex.com/noticias",
          },
          data: { tipo: "noticias", nuevas: totalNuevas.toString() },
        });
        console.log("📲 Notificación enviada vía FCM.");

        // --- WhatsApp Twilio ---
        await client.messages.create({
          from: WHATSAPP_NUMBER,
          to: "whatsapp:+519XXXXXXXX", // cambia por admin o grupo de difusión
          body: `${titulo}\n${cuerpo}\n👉 Ver más en https://buholex.com/noticias`,
        });
        console.log("📩 Notificación enviada vía WhatsApp.");
      }
    } catch (err) {
      console.error("❌ Error enviando notificaciones:", err.message);
    }

    console.log("⏳ [CronNoticias] Ciclo completado.\n");
  });
}
