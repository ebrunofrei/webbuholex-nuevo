// backend/routes/export.js
// ============================================================
// 🦉 BúhoLex | Exportador PRO de borradores (Word / PDF)
// - POST /api/export/docx  → genera .docx con formato judicial
// - POST /api/export/pdf   → genera .pdf con formato judicial
// ============================================================

import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  AlignmentType,
} from "docx";
import PDFDocument from "pdfkit";

const router = express.Router();

// Helpers ESM para dirname real
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Carpeta temporal donde guardamos los archivos exportados
const EXPORT_DIR = path.join(__dirname, "..", "tmp_exports");
if (!fs.existsSync(EXPORT_DIR)) {
  fs.mkdirSync(EXPORT_DIR, { recursive: true });
}

// ---------- Helpers de formato / nombres ----------------------------------

// Fuente y tamaño "de juzgado"
const BASE_FONT = "Times New Roman";
const BASE_SIZE = 24; // 12 pt

// Detecta si una línea es encabezado fuerte (EXPEDIENTE, SUMILLA, SEÑOR JUEZ, etc.)
function isStrongHeader(line) {
  const t = line.replace(/\*\*/g, "").replace(/__/g, "").trim().toUpperCase();
  if (!t) return false;

  const patterns = [
    /^EXPEDIENTE/,
    /^SECRETARIO/,
    /^N[º°]\s*DE\s*ESCRITO/,
    /^SUMILLA/,
    /^SEÑOR JUEZ/,
  ];

  return patterns.some((rx) => rx.test(t));
}

// Detecta si es un título de sección tipo I. PETITORIO, III. HECHOS, etc.
function isSectionHeading(line) {
  const clean = line.replace(/\*\*/g, "").replace(/__/g, "").trim().toUpperCase();
  if (!clean) return false;

  const patterns = [
    /^I\./,
    /^II\./,
    /^III\./,
    /^IV\./,
    /^V\./,
    /^VI\./,
    /^VII\./,
    /^VIII\./,
    /^IX\./,
    /^X\./,
    /\bPETITORIO\b/,
    /\bHECHOS EN QUE SE FUNDA LA DEMANDA\b/,
    /\bFUNDAMENTACI[ÓO]N JUR[ÍI]DICA\b/,
    /\bV[ÍI]A PROCEDIMENTAL\b/,
    /\bMEDIOS PROBATORIOS\b/,
    /\bANEXOS\b/,
    /\bPOR TANTO\b/,
  ];

  return patterns.some((rx) => rx.test(clean));
}

// Convierte una línea a TextRuns con formato (negrita, tamaño, fuente)
function buildRunsFromLine(line, { forceBold = false } = {}) {
  if (!line) {
    return [
      new TextRun({
        text: "",
        size: BASE_SIZE,
        font: BASE_FONT,
      }),
    ];
  }

  const hasMdBold = /\*\*(.*?)\*\*/.test(line) || /__(.*?)__/.test(line);
  const cleaned = line.replace(/\*\*/g, "").replace(/__/g, "");

  const bold = forceBold || hasMdBold;

  return [
    new TextRun({
      text: cleaned,
      bold,
      size: BASE_SIZE,
      font: BASE_FONT,
    }),
  ];
}

// Construye un párrafo DOCX con formato PRO según el tipo de línea
function buildParagraphFromLine(line) {
  const raw = String(line || "");
  const trimmed = raw.trim();

  // Línea en blanco → párrafo vacío con aire
  if (!trimmed) {
    return new Paragraph({
      children: [
        new TextRun({
          text: "",
          size: BASE_SIZE,
          font: BASE_FONT,
        }),
      ],
      spacing: {
        before: 80,
        after: 80,
      },
    });
  }

  const strongHeader = isStrongHeader(raw);
  const sectionHeading = isSectionHeading(raw);

  // Encabezados tipo EXPEDIENTE / SUMILLA / SEÑOR JUEZ
  if (strongHeader) {
    return new Paragraph({
      children: buildRunsFromLine(raw, { forceBold: true }),
      alignment: AlignmentType.JUSTIFIED,
      spacing: {
        before: 120,
        after: 120,
        line: 276, // ~1.15
      },
    });
  }

  // Títulos de secciones (PETITORIO, HECHOS, etc.)
  if (sectionHeading) {
    return new Paragraph({
      children: buildRunsFromLine(raw, { forceBold: true }),
      alignment: AlignmentType.JUSTIFIED,
      spacing: {
        before: 240,
        after: 120,
        line: 276,
      },
    });
  }

  // Párrafo normal (cuerpo del escrito)
  return new Paragraph({
    children: buildRunsFromLine(raw),
    alignment: AlignmentType.JUSTIFIED,
    spacing: {
      before: 60,
      after: 160,
      line: 276,
    },
  });
}

// Construye el Document DOCX completo desde texto plano
function buildDocFromPlainText(texto = "") {
  const lines = String(texto || "").split(/\r?\n/);

  const paragraphs = lines.map((line) => buildParagraphFromLine(line));

  return new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1440, // 2.5 cm
              bottom: 1440,
              left: 1440,
              right: 1440,
            },
          },
        },
        children: paragraphs,
      },
    ],
  });
}

// Slug sencillo para nombres de archivo bonitos
function slugify(str = "") {
  return String(str || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40)
    .toLowerCase();
}

function buildFilename({ tipoDocumento, expediente, etiqueta, ext = "docx" }) {
  const parts = [];

  if (tipoDocumento) parts.push(tipoDocumento);
  if (expediente) parts.push(expediente);
  if (etiqueta) parts.push(etiqueta);

  let base = parts.join("_");
  if (!base) base = "litisbot";

  const safeBase = slugify(base);
  const stamp = Date.now();

  return `${safeBase || "litisbot"}_${stamp}.${ext}`;
}

// --------- Generación de PDF desde texto plano -----------------------------

function buildPdfFromPlainText(texto = "", filePath) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margins: {
        top: 72, // ~2.5 cm
        bottom: 72,
        left: 72,
        right: 72,
      },
    });

    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    doc.font("Times-Roman").fontSize(12);

    const lines = String(texto || "").split(/\r?\n/);

    lines.forEach((line) => {
      const raw = String(line || "");
      const trimmed = raw.trim();

      if (!trimmed) {
        // Línea en blanco: un poco de espacio vertical
        doc.moveDown(0.8);
        return;
      }

      const strongHeader = isStrongHeader(raw);
      const sectionHeading = isSectionHeading(raw);

      const cleaned = trimmed.replace(/\*\*/g, "").replace(/__/g, "");

      if (strongHeader || sectionHeading) {
        doc.moveDown(0.6);
        doc.font("Times-Bold").fontSize(12);
        doc.text(cleaned, {
          align: "justify",
        });
        doc.moveDown(0.3);
        doc.font("Times-Roman").fontSize(12);
      } else {
        doc.text(cleaned, {
          align: "justify",
        });
        doc.moveDown(0.2);
      }
    });

    doc.end();

    stream.on("finish", () => resolve());
    stream.on("error", (err) => reject(err));
  });
}

// ---------- Ruta principal de exportación -----------------------------------

router.post("/export/:format", async (req, res) => {
  const { format } = req.params;
  const { texto, content, tipoDocumento, expediente, etiqueta } = req.body || {};
  const finalText = texto || content || "";
  const fmt = (format || "").toLowerCase();

  if (!finalText || typeof finalText !== "string" || !finalText.trim()) {
    return res.status(400).json({ ok: false, error: "Falta texto a exportar" });
  }

  if (!["docx", "pdf"].includes(fmt)) {
    return res.status(400).json({ ok: false, error: "Formato no soportado" });
  }

  try {
    if (fmt === "docx") {
      const doc = buildDocFromPlainText(finalText);
      const buffer = await Packer.toBuffer(doc);

      const filename = buildFilename({
        tipoDocumento,
        expediente,
        etiqueta,
        ext: "docx",
      });

      const filePath = path.join(EXPORT_DIR, filename);
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      );
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${filename}"`
      );
      res.setHeader("Content-Length", buffer.length);

      return res.end(buffer); // ⬅️ CLAVE

    }

    if (fmt === "pdf") {
      const filename = buildFilename({
        tipoDocumento,
        expediente,
        etiqueta,
        ext: "pdf",
      });

      const filePath = path.join(EXPORT_DIR, filename);
      await buildPdfFromPlainText(finalText, filePath);

      return res.json({
        ok: true,
        url: `/exports/${filename}`,
      });
    }
  } catch (err) {
    console.error("[export] Error:", err);
    return res.status(500).json({ ok: false, error: "Error interno" });
  }
});

export default router;
