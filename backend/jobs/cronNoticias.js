// backend/jobs/cronNoticias.js
import cron from "node-cron";
import { actualizarNoticias } from "#services/noticiasService.js";
import { actualizarNoticiasYJurisprudencia } from "#services/noticiasJuridicasService.js";
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

    // Generales
    let nuevasGenerales = 0;
    try {
      const generales = await actualizarNoticias({ scope: "generales" });
      nuevasGenerales = generales?.nuevas || 0;
      console.log(
        `✅ Noticias generales actualizadas: ${generales?.total || 0} (nuevas: ${nuevasGenerales}).`
      );
    } catch (err) {
      console.error("❌ Error al actualizar noticias generales:", err.message);
    }

    // Jurídicas
    let nuevasJuridicas = 0;
    try {
      const juridicas = await actualizarNoticiasYJurisprudencia();
      nuevasJuridicas = juridicas?.nuevas || 0;
      console.log(
        `✅ Noticias jurídicas actualizadas: ${juridicas?.total || 0} (nuevas: ${nuevasJuridicas}).`
      );
    } catch (err) {
      console.error("❌ Error al actualizar noticias jurídicas:", err.message);
    }

    // 🔔 Notificaciones
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
          to: "whatsapp:+519XXXXXXXX", // Número de difusión o administrador
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
