import nodemailer from "nodemailer";
import { enviarWhatsApp } from "./whatsappService.js";
import { enviarTelegram } from "./telegramService.js";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Renombrada a enviarEmail
async function enviarEmail(destinatario, asunto, mensajeHtml) {
  await transporter.sendMail({
    from: `"LitisBot" <${process.env.EMAIL_USER}>`,
    to: destinatario,
    subject: asunto,
    html: mensajeHtml
  });
}

export { enviarEmail, enviarWhatsApp, enviarTelegram };
