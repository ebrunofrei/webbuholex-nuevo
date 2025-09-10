// utils/translateHelper.js
import { v2 as TranslateV2 } from "@google-cloud/translate";

// Inicializa el cliente de Google Translate
const translate = new TranslateV2.Translate({
  key: process.env.GOOGLE_TRANSLATE_API_KEY
});

/**
 * Traduce texto a un idioma usando Google Translate
 * @param {string} texto - El texto a traducir
 * @param {string} idiomaDestino - Código ISO 639-1 del idioma destino (por ejemplo, "qu" para quechua)
 * @returns {Promise<string>} - Texto traducido
 */
async function traducirTextoGoogle(texto, idiomaDestino) {
  try {
    const [traduccion] = await translate.translate(texto, idiomaDestino);
    return traduccion;
  } catch (err) {
    console.error("❌ Error al traducir con Google:", err.message);
    return texto + "\n\n[Advertencia: No fue posible traducir completamente al idioma seleccionado.]";
  }
}

/**
 * Devuelve el código de idioma compatible con Google Translate.
 */
function getCodigoGoogleIdioma(idiomaApp) {
  switch (idiomaApp) {
    case "qu": return "qu"; // Quechua
    case "ay": return "ay"; // Aymara
    case "shp": return "es"; // Shipibo (no soportado → fallback español)
    case "ash": return "es"; // Asháninka (no soportado → fallback español)
    case "en": return "en"; // Inglés
    case "pt": return "pt"; // Portugués
    default: return "es";   // Español
  }
}

export default { traducirTextoGoogle, getCodigoGoogleIdioma };
