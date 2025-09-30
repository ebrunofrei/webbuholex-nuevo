// routes/whatsapp.js
import { db } from "#services/myFirebaseAdmin.js";
import express from "express";
import { enviarWhatsApp } from "#services/whatsappService.js";

const router = express.Router();

/**
 * 📌 POST /api/send-whatsapp
 * Body esperado:
 * {
 *   to: "+519xxxxxxxx",
 *   body: "Texto del mensaje"
 * }
 */
router.post("/send-whatsapp", async (req, res) => {
  try {
    const { to, body } = req.body || {};

    // --- Validaciones ---
    if (!to || !body) {
      return res.status(400).json({
        success: false,
        error: "Faltan parámetros obligatorios: 'to' y 'body'.",
      });
    }
    if (!to.startsWith("+51")) {
      return res.status(400).json({
        success: false,
        error: "El número debe estar en formato internacional (+51...).",
      });
    }

    // --- Enviar mensaje ---
    const result = await enviarWhatsApp(to, body);
    console.log(`✅ WhatsApp enviado a ${to} (SID: ${result.sid})`);

    // --- Guardar log en Firestore ---
    try {
      await db.collection("whatsapp_logs").add({
        to,
        body,
        sid: result.sid || null,
        fecha: new Date(),
        estado: "enviado",
      });
    } catch (logErr) {
      console.warn("⚠️ No se pudo guardar log de WhatsApp:", logErr.message);
    }

    return res.status(200).json({
      success: true,
      sid: result.sid,
      message: "Mensaje enviado correctamente.",
    });
  } catch (error) {
    console.error("❌ Error enviando WhatsApp:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Error interno enviando WhatsApp.",
    });
  }
});

export default router;
