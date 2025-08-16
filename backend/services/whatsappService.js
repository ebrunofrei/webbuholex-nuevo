// whatsappService.js
import twilio from "twilio";

const client = twilio(process.env.TWILIO_SID, process.env.TWILIO_TOKEN);

/**
 * Envía un mensaje de WhatsApp usando Twilio.
 * @param {string} to Número de destino en formato internacional, ejemplo: +51922038280
 * @param {string} mensaje Contenido del mensaje.
 * @returns {Promise<object>} Respuesta de Twilio
 */
async function enviarWhatsApp(to, mensaje) {
  return client.messages.create({
    body: mensaje,
    from: 'whatsapp:' + process.env.TWILIO_WHATSAPP_NUMBER,
    to: 'whatsapp:' + to, // Ejemplo: whatsapp:+51922038280
  });
}

export { enviarWhatsApp };
