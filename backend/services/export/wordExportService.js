// ============================================================================
// 🦉 wordExportService — Exportación Word judicial (FASE 9.1) — FIX HTTP
// ----------------------------------------------------------------------------
// - Genera .docx válido (buffer)
// - Opcional: guarda a disco (para auditoría / debug)
// - Pensado para descarga directa desde frontend (fetch)
// ============================================================================

import fs from "fs";
import path from "path";
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from "docx";

function safeText(v) {
  if (v === null || v === undefined) return "";
  if (typeof v === "string") return v;
  try {
    return JSON.stringify(v, null, 2);
  } catch {
    return String(v);
  }
}

export async function generateJudicialWord({
  briefing,
  persistToDisk = false,
}) {
  if (!briefing) throw new Error("Briefing vacío");
  if (!briefing.header) throw new Error("Briefing header faltante");
  if (!Array.isArray(briefing.sections)) briefing.sections = [];

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          new Paragraph({
            text: briefing.header.documentTitle || "LEGAL CASE BRIEF",
            heading: HeadingLevel.HEADING_1,
          }),

          new Paragraph({
            children: [
              new TextRun({
                text: `Caso: ${safeText(briefing.header.title)}`,
                bold: true,
              }),
            ],
          }),

          new Paragraph({
            children: [
              new TextRun({
                text: `Fecha de generación: ${new Date(
                  briefing.header.generatedAt || Date.now()
                ).toLocaleDateString("es-PE")}`,
              }),
            ],
          }),

          new Paragraph({ text: "" }),

          ...briefing.sections.flatMap((section) => [
            new Paragraph({
              text: safeText(section?.title || "SECCIÓN").toUpperCase(),
              heading: HeadingLevel.HEADING_2,
            }),

            new Paragraph({
              children: [
                new TextRun({
                  text: safeText(section?.content),
                }),
              ],
            }),

            new Paragraph({ text: "" }),
          ]),
        ],
      },
    ],
  });

  // ✅ Buffer DOCX real y válido
  const buffer = await Packer.toBuffer(doc);

  const filename = `briefing_${safeText(briefing.header.caseId || "case")}.docx`;

  // Opcional: persistencia a disco (sin afectar descarga HTTP)
  let filePath = null;
  if (persistToDisk) {
    const exportDir = path.join(process.cwd(), "backend", "tmp_exports");
    if (!fs.existsSync(exportDir)) fs.mkdirSync(exportDir, { recursive: true });
    filePath = path.join(exportDir, filename);
    fs.writeFileSync(filePath, buffer); // ⚠️ sin encoding
  }

  return { filename, buffer, filePath };
}
