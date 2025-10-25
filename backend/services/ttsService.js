// backend/services/ttsService.js
import fs from "fs";
import path from "path";
import OpenAI from "openai";

// IMPORTANTE: en Railway debes tener OPENAI_API_KEY configurada
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Limpia el texto que viene del bot antes de sintetizarlo.
 * - Quita HTML
 * - Quita frases tipo "lee con voz varonil..." para que NO se lean literalmente
 * - Compacta espacios
 */
function limpiarTextoParaLocucion(textoOriginal) {
  const base = textoOriginal || "";

  // 1. Reemplazar <br> por saltos de línea y quitar el resto de etiquetas HTML
  const sinHTML = base
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ");

  // 2. Quitar instrucciones meta tipo "lee con voz varonil", "habla con voz masculina", etc.
  //    para que la locución no las lea.
  const sinInstrucciones = sinHTML
    .replace(/lee con voz varonil[^.]*[.]/gi, " ")
    .replace(/habla con voz masculina[^.]*[.]/gi, " ")
    .replace(/con tono varonil[^.]*[.]/gi, " ")
    .replace(/con voz masculina[^.]*[.]/gi, " ");

  // 3. Compactar espacios múltiples
  return sinInstrucciones.replace(/\s+/g, " ").trim();
}

/**
 * Genera audio masculino y lo guarda como MP3.
 * @param {string} textoOriginal Texto crudo generado por LitisBot
 * @param {string} rutaSalida    Ruta absoluta al mp3 que vamos a crear
 */
export async function generarVozVaronil(textoOriginal, rutaSalida) {
  // 1. Sanitizar texto
  const textoLimpio = limpiarTextoParaLocucion(textoOriginal);

  // 2. Elegimos una voz más grave/masculina entre las que da OpenAI TTS.
  //    "alloy" suele sonar varonil; evita "aria"/"verse" que son más femeninas.
  const VOZ_MASCULINA = "alloy";

  // 3. Llamar al modelo TTS de OpenAI.
  //    Usa el modelo que tu cuenta soporte. Ejemplos válidos:
  //    - "gpt-4o-mini-tts"
  //    - "tts-1" o "tts-1-hd"
  //
  //    Si te da error con "gpt-4o-mini-tts", prueba "tts-1".
  const resp = await openai.audio.speech.create({
    model: "gpt-4o-mini-tts",
    voice: VOZ_MASCULINA,
    input: textoLimpio,
    format: "mp3",
  });

  // 4. Guardar el binario MP3 en disco
  const audioBuffer = Buffer.from(await resp.arrayBuffer());
  await fs.promises.writeFile(rutaSalida, audioBuffer);

  return rutaSalida;
}
