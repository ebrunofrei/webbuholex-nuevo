// backend/services/ttsService.js
// Este servicio genera voz (MP3) a partir de texto.
// Objetivo: devolver Buffer en memoria (sin escribir archivo temporal).

// IMPORTANTE:
// - Aquí debes integrar tu proveedor real de TTS.
//   Ejemplos reales comunes:
//   - Google Cloud Text-to-Speech
//   - Azure Cognitive Services Speech
//   - ElevenLabs
//   - Amazon Polly
//
// En este esqueleto asumimos que al final obtienes un Buffer de audio MP3.

function limpiarTextoParaLocucion(textoCrudo = "") {
  return (textoCrudo || "")
    // elimina etiquetas HTML del mensaje del bot
    .replace(/<[^>]+>/g, " ")
    // saca instrucciones meta tipo "lee con voz varonil"
    .replace(/lee con voz varonil[^,.]*/gi, " ")
    .replace(/habla como abogado varonil[^,.]*/gi, " ")
    .replace(/con tono varonil[^,.]*/gi, " ")
    // colapsa espacios múltiples
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Genera audio MP3 estilo "abogado varonil, formal y seguro".
 * Devuelve Buffer listo para mandarlo en res.send(...)
 *
 * @param {string} texto Texto legal que quieres leer
 * @returns {Promise<Buffer>} audio MP3
 */
export async function generarVozVaronil(texto = "") {
  // 1. saneamos el texto
  const limpio = limpiarTextoParaLocucion(texto);

  // 2. armamos SSML con voz grave, ritmo ligeramente pausado
  // nota: algunos proveedores aceptan SSML directamente,
  // otros quieren "texto" y parámetros separados.
  const ssml = `
    <speak>
      <prosody pitch="-4st" rate="92%" volume="+2dB">
        ${limpio}
      </prosody>
    </speak>
  `.trim();

  // 3. Llamada al proveedor real de TTS
  //
  // ── EJEMPLO (pseudo-código) ─────────────────────────
  // const result = await textToSpeechClient.synthesize({
  //   input: { ssml },                // o { text: limpio } según el provider
  //   voice: {
  //     languageCode: "es-PE",        // o "es-ES", etc.
  //     name: "es-PE-FormalMale",     // voz masculina seria
  //     gender: "MALE",
  //   },
  //   audioConfig: {
  //     audioEncoding: "MP3",
  //     speakingRate: 0.92,           // un poco más pausado
  //     pitch: -4.0,                  // tono más grave
  //   },
  // });
  //
  // const audioBuffer = result.audioContent; // normalmente viene como Buffer o base64
  // return audioBuffer;
  //
  // ───────────────────────────────────────────────────

  // 4. Mientras no tengamos la voz real conectada:
  // devolvemos un MP3 falso (silencio / placeholder)
  // para que el flujo front→back ya funcione sin reventar.
  //
  // NOTA: Cambia esto apenas conectes tu TTS real,
  // porque este "audio" no es reproducible de verdad.
  const audioBufferFalso = Buffer.from(
    "SUQzAwAAAAAA...MP3_FAKE...",
    "base64"
  );

  return audioBufferFalso;
}
