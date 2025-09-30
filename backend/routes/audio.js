const express = require("express");
const router = express.Router();
const multer = require("multer");
const ffmpeg = require("fluent-ffmpeg");
const fs = require("fs");
const path = require("path");

// Configuración para guardar archivo temporalmente
const upload = multer({ dest: "tmp/" });

router.post("/convertir-mp3", upload.single("audio"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No se subió archivo" });

  const inputPath = req.file.path;
  const outputPath = path.join("tmp", `${Date.now()}_audio.mp3`);

  ffmpeg(inputPath)
    .audioCodec("libmp3lame")
    .toFormat("mp3")
    .on("end", () => {
      // Enviar el archivo MP3 resultante como descarga
      res.download(outputPath, "GrabacionBuhoLex.mp3", (err) => {
        // Limpieza de archivos temporales
        fs.unlink(inputPath, () => {});
        fs.unlink(outputPath, () => {});
      });
    })
    .on("error", (err) => {
      fs.unlink(inputPath, () => {});
      res.status(500).json({ error: "Error al convertir el archivo: " + err.message });
    })
    .save(outputPath);
});

module.exports = router;
