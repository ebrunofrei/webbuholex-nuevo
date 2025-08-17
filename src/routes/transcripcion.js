const express = require("express");
const router = express.Router();
const multer = require("multer");
const fs = require("fs");
const ffmpeg = require("fluent-ffmpeg");

// 1. CONFIGURA GOOGLE CLOUD
process.env.GOOGLE_APPLICATION_CREDENTIALS = "./ruta/tu-clave-servicio.json";
const speech = require("@google-cloud/speech");
const client = new speech.SpeechClient();

// 2. SUBIDA DE ARCHIVO TEMPORAL
const upload = multer({ dest: "tmp/" });

/**
 * Convierte video a audio (wav) si es necesario
 */
function convertirAudio(inputPath, outputPath) {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .audioCodec("pcm_s16le")
      .audioChannels(1)
      .audioFrequency(16000)
      .format("wav")
      .on("end", () => resolve(outputPath))
      .on("error", reject)
      .save(outputPath);
  });
}

router.post("/transcribir", upload.single("archivo"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No se subió archivo" });

  const inputPath = req.file.path;
  const outputPath = inputPath + ".wav";

  // 1. Si es video o audio comprimido, conviértelo a WAV 16kHz mono
  try {
    await convertirAudio(inputPath, outputPath);
    const file = fs.readFileSync(outputPath);

    // 2. Prepara configuración para Google Speech-to-Text
    const audio = { content: file.toString("base64") };
    const config = {
      encoding: "LINEAR16",
      sampleRateHertz: 16000,
      languageCode: "es-PE", // o "es-ES", "es-419"
      enableAutomaticPunctuation: true,
      model: "default",
    };

    // 3. Envía a Google y espera el resultado
    const [response] = await client.recognize({ audio, config });
    const transcript = response.results
      .map(r => r.alternatives[0].transcript)
      .join("\n");

    // 4. Limpieza de archivos
    fs.unlinkSync(inputPath);
    fs.unlinkSync(outputPath);

    res.json({ transcripcion: transcript });
  } catch (e) {
    fs.unlink(inputPath, () => {});
    if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
    res.status(500).json({ error: "Error al transcribir: " + e.message });
  }
});

module.exports = router;
