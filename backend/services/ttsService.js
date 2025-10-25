// backend/services/ttsService.js
import fs from "fs/promises";
import path from "path";
// importa aquí tu SDK real de TTS.
// Ejemplo ficticio con SSML genérico (ajusta a tu proveedor):
// import { textToSpeechClient } from "algún-sdk";

function limpiarTextoParaLocucion(textoCrudo = "") {
  return (textoCrudo || "")
    // quita HTML
    .replace(/<[^>]+>/g, " ")
    // quita instrucciones tipo "lee con voz varonil", etc.
    .replace(/lee con voz varonil[^,.]*/gi, " ")
    .replace(/habla como abogado varonil[^,.]*/gi, " ")
    .replace(/con tono varonil[^,.]*/gi, " ")
    // espacios múltiples -> uno
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Genera MP3 con voz masculina grave estilo "abogado".
 * @param {string} texto
 * @param {string} rutaSalida absoluta, ej "./voz.mp3"
 */
export async function generarVozVaronil(texto = "", rutaSalida) {
  const limpio = limpiarTextoParaLocucion(texto);

  // SSML con pitch grave y estilo formal.
  const ssml = `
    <speak>
      <prosody pitch="-4st" rate="92%" volume="+2dB">
        ${limpio}
      </prosody>
    </speak>
  `.trim();

  // ===== EJEMPLO GENÉRICO =====
  // Reemplaza esta parte por la llamada real a tu proveedor de TTS.
  // Debe:
  //  - usar una voz masculina (ej: "es-PE-Neutral-Male" / "es-ES-DiegoNeural" / etc.)
  //  - aceptar SSML o al menos parámetros de pitch/rate
  //
  // const audioBuffer = await textToSpeechClient.synthesize({
  //   input: { ssml },
  //   voice: {
  //     languageCode: "es-PE",
  //     name: "es-PE-male-abogado", // escoge una voz varonil disponible
  //     gender: "MALE"
  //   },
  //   audioConfig: {
  //     audioEncoding: "MP3",
  //     speakingRate: 0.92,
  //     pitch: -4.0,
  //   }
  // });

  // simulación mientras integras proveedor real:
  const audioBuffer = Buffer.from(
    "SUQzAwAAAAAA...MP3_FAKE...", // <-- aquí iría el binario real
    "base64"
  );

  // guardar el mp3 en disco para que el endpoint lo sirva
  await fs.writeFile(path.resolve(rutaSalida), audioBuffer);
}
