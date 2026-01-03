import { db } from "#services/myFirebaseAdmin.js";

async function logWhatsApp({ usuarioId, to, mensaje, meta = {}, status = "sent" }) {
  try {
    await db.collection("whatsapp_logs").add({
      usuarioId: usuarioId || null,
      to: String(to || ""),
      mensaje: String(mensaje || ""),
      status,
      meta,
      createdAt: new Date(),
    });
  } catch (e) {
    // logging nunca debe tumbar el envío
    console.error("firebase whatsapp log error:", e?.message || e);
  }
}

export { logWhatsApp };
