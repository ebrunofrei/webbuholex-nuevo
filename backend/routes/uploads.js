// backend/routes/uploads.js
// ============================================================
// 🦉 BúhoLex | Subida genérica de adjuntos para el chat
// - POST /api/files/upload
//   -> Recibe cualquier archivo y devuelve una URL pública
// ============================================================

import express from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Carpeta donde guardamos adjuntos del chat
const UPLOAD_DIR = path.join(__dirname, "..", "uploads", "chat");
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Config multer con disco
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    const timestamp = Date.now();
    const safeName = file.originalname
      .replace(/\s+/g, "_")
      .replace(/[^a-zA-Z0-9._-]/g, "");
    cb(null, `${timestamp}_${safeName}`);
  },
});

const upload = multer({ storage });

router.post("/files/upload", upload.single("file"), (req, res) => {
  try {
    const file = req.file;
    if (!file) {
      return res
        .status(400)
        .json({ ok: false, error: "No se adjuntó ningún archivo" });
    }

    // Ruta pública (asegúrate en server.js de exponer /uploads)
    const publicUrl = `/uploads/chat/${file.filename}`;

    return res.json({
      ok: true,
      url: publicUrl,
      originalName: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
    });
  } catch (err) {
    console.error("[files/upload] Error:", err);
    return res
      .status(500)
      .json({ ok: false, error: "Error interno al subir el archivo" });
  }
});

export default router;
