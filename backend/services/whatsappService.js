// whatsappService.js (Enterprise: puro Twilio, cero Firebase)
import twilio from "twilio";

const { TWILIO_SID, TWILIO_TOKEN, TWILIO_WHATSAPP_NUMBER } = process.env;

if (!TWILIO_SID || !TWILIO_TOKEN || !TWILIO_WHATSAPP_NUMBER) {
  // No lanzamos error aquí para no tumbar el build si el entorno aún no está set.
  // Fallará al enviar con mensaje claro.
  console.warn(
    "[whatsappService] Faltan variables TWILIO_SID / TWILIO_TOKEN / TWILIO_WHATSAPP_NUMBER"
  );
}

const client = twilio(TWILIO_SID, TWILIO_TOKEN);

function normalizePhone(to) {
  const phone = String(to || "").trim();
  // Permitimos +XXXXXXXXXXX. Si viene sin +, lo dejamos pasar igual,
  // pero Twilio suele exigir E.164, así que mejor validar en frontend también.
  return phone;
}

/**
 * Envía un mensaje de WhatsApp usando Twilio.
 * @param {string} to Número de destino en formato internacional, ejemplo: +51922038280
 * @param {string} mensaje Contenido del mensaje.
 * @returns {Promise<object>} Respuesta de Twilio
 */
async function enviarWhatsApp(to, mensaje) {
  const phone = normalizePhone(to);
  const body = String(mensaje || "").trim();

  if (!TWILIO_SID || !TWILIO_TOKEN || !TWILIO_WHATSAPP_NUMBER) {
    throw new Error("WhatsApp: faltan credenciales de Twilio (env vars)");
  }
  if (!phone) throw new Error("WhatsApp: parámetro 'to' requerido");
  if (!body) throw new Error("WhatsApp: 'mensaje' vacío");

  return client.messages.create({
    body,
    from: "whatsapp:" + TWILIO_WHATSAPP_NUMBER,
    to: "whatsapp:" + phone,
  });
}

export { enviarWhatsApp };
