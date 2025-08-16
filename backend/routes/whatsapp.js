// whatsapp.js
import express from "express";
import { enviarWhatsApp } from "../services/whatsappService.js";

const router = express.Router();

/**
 * POST /api/send-whatsapp
 * Body: { "to": "+51922038280", "body": "Texto del mensaje" }
 */
router.post("/send-whatsapp", async (req, res) => {
  const { to, body } = req.body;
  if (!to || !body) {
    return res.status(400).json({ success: false, error: "Falta destinatario o mensaje." });
  }
  try {
    const result = await enviarWhatsApp(to, body);
    res.status(200).json({ success: true, sid: result.sid });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
