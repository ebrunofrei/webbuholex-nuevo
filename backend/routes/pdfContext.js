// backend/routes/pdfContext.js
// ============================================================
// 🦉 BúhoLex | Contexto de jurisprudencia desde PDF de usuario
// - POST /api/pdf/juris-context
//   -> Recibe un PDF (sentencia/resolución) y devuelve texto para IA
// ============================================================

import express from "express";
import multer from "multer";
import {
  extractPlainTextFromPdf,
  buildPdfJurisContext,
} from "../services/pdfTextService.js";

const router = express.Router();

// ---------- Configuración de multer en memoria ----------
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: {
    fileSize: 25 * 1024 * 1024, // 25 MB
  },
  fileFilter(req, file, cb) {
    const mime = (file.mimetype || "").toLowerCase();
    const name = (file.originalname || "").toLowerCase();

    if (mime.includes("pdf") || name.endsWith(".pdf")) {
      return cb(null, true);
    }

    return cb(
      new multer.MulterError(
        "LIMIT_UNEXPECTED_FILE",
        "Solo se permiten archivos PDF."
      )
    );
  },
});

// Campo estándar: "file"
const uploadSinglePdf = upload.single("file");

/* -------------------------------------------------------------------------- */
/* POST /api/pdf/juris-context                                                */
/* -------------------------------------------------------------------------- */
router.post("/juris-context", (req, res) => {
  uploadSinglePdf(req, res, async (err) => {
    // Errores de multer (tamaño, tipo, etc.)
    if (err instanceof multer.MulterError) {
      console.error("[pdf/juris-context] Error multer:", err);

      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({
          ok: false,
          error:
            "El archivo PDF excede el tamaño máximo permitido (25 MB).",
          code: "PDF_TOO_LARGE",
        });
      }

      return res.status(400).json({
        ok: false,
        error: err.message || "Archivo no válido para esta operación.",
        code: err.code || "MULTER_ERROR",
      });
    }

    // Otros errores previos al procesamiento
    if (err) {
      console.error("[pdf/juris-context] Error inesperado en upload:", err);
      return res.status(500).json({
        ok: false,
        error: "Error al recibir el archivo PDF.",
        code: "UPLOAD_ERROR",
      });
    }

    const file = req.file;

    if (!file || !file.buffer) {
      console.warn(
        "[pdf/juris-context] Sin archivo recibido o sin buffer. req.file =",
        file
      );
      return res.status(400).json({
        ok: false,
        error:
          'No se recibió ningún archivo PDF. Envíalo en el campo "file".',
        code: "NO_FILE",
      });
    }

    try {
      const {
        titulo,
        numeroExpediente,
        organo,
        especialidad,
        fechaResolucion,
        etiqueta,
      } = req.body || {};

      // 1️⃣ Extraer texto plano desde el PDF usando el servicio
      const result = await extractPlainTextFromPdf(file.buffer, {
        maxChars: 40_000,
      });

      if (!result.ok) {
        console.warn(
          "[pdf/juris-context] extractPlainTextFromPdf no-ok:",
          result
        );
        return res.status(400).json({
          ok: false,
          error:
            result.error ||
            "No se pudo leer correctamente el contenido del PDF.",
          code: result.code || "PDF_READ_FAILED",
        });
      }

      const textoPlano = result.texto || "";

      // 2️⃣ Construir contexto enriquecido para IA
      const meta = {
        titulo: titulo || "",
        numeroExpediente: numeroExpediente || "",
        organo: organo || "",
        especialidad: especialidad || "",
        fechaResolucion: fechaResolucion || "",
        etiqueta: etiqueta || "",
        filename: file.originalname,
        size: file.size,
        mimetype: file.mimetype,
        ...(result.meta || {}),
      };

      const contexto = buildPdfJurisContext({
        textoPlano,
        meta,
      });

      if (!contexto || !contexto.jurisTextoBase) {
        console.error(
          "[pdf/juris-context] buildPdfJurisContext devolvió objeto inválido:",
          contexto
        );
        return res.status(500).json({
          ok: false,
          error:
            "El PDF fue leído, pero no se pudo construir el contexto jurídico.",
          code: "CONTEXT_BUILD_FAILED",
        });
      }

      return res.json({
        ok: true,
        jurisTextoBase: contexto.jurisTextoBase,
        meta: contexto.meta || meta,
      });
    } catch (e) {
      console.error("[pdf/juris-context] Error inesperado:", e);
      return res.status(500).json({
        ok: false,
        error: "Error interno al procesar el PDF de jurisprudencia.",
        code: "INTERNAL_ERROR",
      });
    }
  });
});

export default router;
