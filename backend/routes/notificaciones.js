// buholex-backend/routes/notificaciones.js
import express from "express";
const router = express.Router();
import {  enviarEmail, enviarWhatsApp, enviarTelegram  } from '../services/emailService.js'; // O el que corresponda

// Endpoint para recibir notificaciones de entidades externas
router.post("/", async (req, res) => {
  try {
    const { email, celular, telegram, mensaje, expedienteId } = req.body;

    // 1. Guarda la notificación en tu BD o Firestore si es necesario
    // 2. Envía notificación por los canales que existan
    if (email) await enviarEmail(email, mensaje);
    if (celular) await enviarWhatsApp(celular, mensaje);
    if (telegram) await enviarTelegram(telegram, mensaje);

    return res.status(200).json({ ok: true, msg: "Notificación enviada correctamente" });
  } catch (error) {
    return res.status(500).json({ ok: false, msg: error.message });
  }
});

export default router;
