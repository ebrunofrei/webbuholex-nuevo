import express from "express";
import multer from "multer";
import { extractTextByType } from "../services/files/extractTextByType.js";

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

router.post("/extract", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Archivo requerido para OCR",
      });
    }

    const { buffer, originalname, mimetype, size } = req.file;

    const text = await extractTextByType(buffer, originalname, mimetype);

    return res.json({
      success: true,
      text: text || "",
      meta: {
        filename: originalname,
        mimetype,
        size,
        length: text?.length || 0,
        extractedAt: new Date().toISOString(),
      },
    });

  } catch (err) {
    console.error("❌ OCR error:", err);
    return res.status(500).json({
      success: false,
      message: "Error interno al procesar OCR",
    });
  }
});

export default router;
