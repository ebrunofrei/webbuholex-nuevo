// ============================================================================
// 🦉 PDF EXPORT SERVICE — Universal Legal Brief (FASE 9.2)
// ----------------------------------------------------------------------------
// - Neutral
// - No jurisdiccional
// - Lectura estratégica
// ============================================================================

import PDFDocument from "pdfkit";

export async function generateJudicialPdf({ caseSession, timeline }) {
  return new Promise((resolve) => {
    const doc = new PDFDocument({
      size: "A4",
      margins: { top: 50, bottom: 50, left: 50, right: 50 },
    });

    const buffers = [];
    doc.on("data", buffers.push.bind(buffers));
    doc.on("end", () => resolve(Buffer.concat(buffers)));

    // ===============================
    // HEADER
    // ===============================
    doc
      .fontSize(18)
      .text("Legal Strategic Brief", { align: "center" })
      .moveDown(0.5);

    doc
      .fontSize(10)
      .fillColor("gray")
      .text("Documento de análisis jurídico estratégico", {
        align: "center",
      });

    doc.moveDown(2);
    doc.fillColor("black");

    // ===============================
    // CASE METADATA
    // ===============================
    doc.fontSize(12).text("Case Overview", { underline: true });
    doc.moveDown(0.5);

    doc.fontSize(10).text(`Case ID: ${caseSession._id}`);
    doc.text(`Title: ${caseSession.title || "Untitled Case"}`);
    doc.text(`Generated at: ${new Date().toISOString()}`);

    doc.moveDown(1.5);

    // ===============================
    // TIMELINE
    // ===============================
    doc.fontSize(12).text("Audit Timeline", { underline: true });
    doc.moveDown(0.5);

    timeline.forEach((ev, idx) => {
      doc
        .fontSize(10)
        .text(
          `${idx + 1}. ${new Date(ev.at).toLocaleString()} — ${
            ev.type || "event"
          }`
        );

      if (ev.payload) {
        doc
          .fontSize(9)
          .fillColor("gray")
          .text(JSON.stringify(ev.payload, null, 2), {
            indent: 20,
          })
          .fillColor("black");
      }

      doc.moveDown(0.5);
    });

    // ===============================
    // FOOTER
    // ===============================
    doc.moveDown(2);
    doc
      .fontSize(8)
      .fillColor("gray")
      .text(
        "This document is an analytical aid. It does not replace professional legal judgment.",
        { align: "center" }
      );

    doc.end();
  });
}
