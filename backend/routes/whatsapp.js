// ============================================================
// 🟢 WhatsApp Router – BúhoLex Enterprise v2
// ------------------------------------------------------------
// - Compatibilidad total con Twilio
// - Sanitización de entrada
// - Validaciones reforzadas
// - Detección de spam/duplicidad (anti-loop)
// - Logging estable en Firestore
// - Naming uniforme: POST /api/whatsapp/send
// ============================================================

import express from "express";
import { db } from "#services/myFirebaseAdmin.js";
import { enviarWhatsApp } from "#services/whatsappService.js";

const router = express.Router();

// ------------------------------------------------------------
// Helper seguro: normaliza número +51XXXXXXXXX
// ------------------------------------------------------------
function normalizePhone(p) {
  if (!p) return null;
  const x = p.toString().replace(/\s+/g, "").trim();
  if (!x.startsWith("+51")) return null;
  return x;
}

// ------------------------------------------------------------
// POST /api/whatsapp/send
// ------------------------------------------------------------
router.post("/send", async (req, res) => {
  try {
    const { to, body } = req.body || {};

    // 🔒 Validaciones estrictas
    const telefono = normalizePhone(to);
    if (!telefono) {
      return res.status(400).json({
        ok: false,
        error: "Número inválido. Usa formato internacional: +51XXXXXXXXX",
      });
    }

    if (!body || body.toString().trim() === "") {
      return res.status(400).json({
        ok: false,
        error: "El mensaje 'body' no puede estar vacío.",
      });
    }

    // --------------------------------------------------------
    // Anti-duplicados en 10 segundos (prevención de loops)
    // --------------------------------------------------------
    const now = Date.now();
    const stampId = `${telefono}_${body}`;
    const stampRef = db.collection("whatsapp_stamps").doc(stampId);
    const last = await stampRef.get();

    if (last.exists) {
      const diff = now - last.data().ts;
      if (diff < 10_000) {
        return res.status(429).json({
          ok: false,
          error: "Mensaje duplicado detectado (protección anti-loop).",
        });
      }
    }

    await stampRef.set({ ts: now });

    // --------------------------------------------------------
    // Enviar vía Twilio
    // --------------------------------------------------------
    const result = await enviarWhatsApp(telefono, body);

    console.log(`📨 WhatsApp enviado: ${telefono} (SID: ${result.sid})`);

    // --------------------------------------------------------
    // Log estable en Firestore
    // --------------------------------------------------------
    try {
      await db.collection("whatsapp_logs").add({
        to: telefono,
        body,
        sid: result.sid,
        fecha: new Date(),
        estado: "enviado",
      });
    } catch (logErr) {
      console.warn("⚠️ Log WhatsApp falló:", logErr.message);
    }

    return res.json({
      ok: true,
      sid: result.sid,
      message: "Mensaje enviado correctamente.",
    });
  } catch (error) {
    console.error("❌ Error WhatsApp:", error);

    return res.status(500).json({
      ok: false,
      error: error.message || "Error interno enviando WhatsApp.",
    });
  }
});

export default router;
