// ============================================================================
// 🦉 PDF BUILDER — UNIVERSAL (FASE 9.2)
// ----------------------------------------------------------------------------
// - No localista
// - No judicial específico
// - Documento FINAL (no editable)
// ============================================================================

import PDFDocument from "pdfkit";
import getNeutralLayout from "./layouts/neutral.js";

export async function generateUniversalPdf({
  title,
  sections = [],
  metadata = {},
  style = "neutral",
}) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: "A4",
        margins: { top: 50, bottom: 50, left: 50, right: 50 },
      });

      const buffers = [];
      doc.on("data", buffers.push.bind(buffers));
      doc.on("end", () => resolve(Buffer.concat(buffers)));

      // 🔹 Layout
      const layout = getNeutralLayout(doc);

      // 🔹 Portada
      layout.renderCover({
        title,
        subtitle: metadata.subtitle,
        date: metadata.date || new Date().toLocaleDateString(),
      });

      // 🔹 Contenido
      sections.forEach((section) => {
        layout.renderSection(section.heading, section.content);
      });

      // 🔹 Footer final
      layout.renderFooter(metadata);

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}
