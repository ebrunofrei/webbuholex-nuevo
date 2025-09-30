// routes/pagos.js
import { db, auth, storage } from "#services/myFirebaseAdmin.js";
import express from "express";
import nodemailer from "nodemailer";
// Si usas Twilio: import twilio from "twilio";

const router = express.Router();

/**
 * 📌 Endpoint: /pagoqr
 * Body esperado:
 * {
 *   nombre: string,
 *   email: string,
 *   celular: string,
 *   plan: string,
 *   archivoComprobanteUrl: string
 * }
 */
router.post("/pagoqr", async (req, res) => {
  try {
    const { nombre, email, celular, plan, archivoComprobanteUrl } = req.body || {};

    // --- Validaciones básicas ---
    if (!nombre || !email || !celular || !plan || !archivoComprobanteUrl) {
      return res.status(400).json({
        success: false,
        error: "Faltan datos obligatorios.",
      });
    }

    // --- Configuración de transporte de email ---
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.NOTIFY_EMAIL,
        pass: process.env.NOTIFY_EMAIL_PASS,
      },
    });

    // --- Enviar correo al usuario y al admin ---
    try {
      await transporter.sendMail({
        from: `"BúhoLex" <${process.env.NOTIFY_EMAIL}>`,
        to: `${email}, ${process.env.ADMIN_EMAIL}`,
        subject: `Pago QR recibido: ${plan}`,
        html: `
          <p><b>${nombre}</b> ha enviado comprobante de pago QR para el plan <b>${plan}</b>.</p>
          <p>📞 Contacto: ${celular}</p>
          <p>📎 <a href="${archivoComprobanteUrl}" target="_blank">Ver comprobante</a></p>
        `,
      });
      console.log("✅ Correo de notificación enviado.");
    } catch (e) {
      console.error("⚠️ No se pudo enviar el correo:", e.message);
    }

    // --- Guardar registro en Firestore ---
    try {
      await db.collection("pagos_qr").add({
        nombre,
        email,
        celular,
        plan,
        archivoComprobanteUrl,
        fecha: new Date(),
        estado: "pendiente",
      });
    } catch (e) {
      console.warn("⚠️ No se pudo guardar en Firestore:", e.message);
    }

    // --- Notificación WhatsApp (ejemplo Twilio) ---
    // const client = twilio(process.env.TWILIO_SID, process.env.TWILIO_TOKEN);
    // await client.messages.create({
    //   body: `${nombre} envió comprobante QR para ${plan}: ${archivoComprobanteUrl}`,
    //   from: "whatsapp:+14155238886",
    //   to: `whatsapp:+51${celular}`,
    // });

    return res.json({
      success: true,
      message: "¡Pago QR recibido! Serás contactado para activar tu plan.",
    });
  } catch (error) {
    console.error("❌ Error en /pagoqr:", error);
    return res.status(500).json({
      success: false,
      error: "Error procesando el pago QR.",
    });
  }
});

export default router;
