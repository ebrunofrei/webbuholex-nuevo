import express from "express";
const router = express.Router();
import nodemailer from "nodemailer";
// Si usas Twilio, require('twilio'), o tu propia función WhatsApp

router.post('/pagoqr', async (req, res) => {
  const { nombre, email, celular, plan, archivoComprobanteUrl } = req.body;
  // ... validaciones básicas ...

  // EMAIL (reemplaza con tus credenciales)
  let transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.NOTIFY_EMAIL,
      pass: process.env.NOTIFY_EMAIL_PASS
    }
  });

  // Enviar correo al admin y al usuario
  await transporter.sendMail({
    from: `"BúhoLex" <${process.env.NOTIFY_EMAIL}>`,
    to: `${email},${process.env.ADMIN_EMAIL}`,
    subject: `Pago QR recibido: ${plan}`,
    html: `<b>${nombre}</b> ha enviado comprobante de pago QR para el plan <b>${plan}</b>.
           <br/>Contacto: ${celular}<br/>
           <a href="${archivoComprobanteUrl}">Ver comprobante</a>`
  });

  // WhatsApp (ejemplo con Twilio)
  // import client from "twilio";(process.env.TWILIO_SID, process.env.TWILIO_TOKEN);
  // await client.messages.create({
  //   body: `${nombre} envió comprobante QR para ${plan}: ${archivoComprobanteUrl}`,
  //   from: 'whatsapp:+14155238886',
  //   to: 'whatsapp:+51xxxxxxxxx'
  // });

  res.json({ ok: true, message: "¡Pago QR recibido! Serás contactado para activar tu plan." });
});

export default router;
