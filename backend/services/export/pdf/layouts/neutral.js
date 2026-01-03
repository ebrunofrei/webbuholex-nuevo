// ============================================================================
// 🧾 PDF LAYOUT — NEUTRAL
// ----------------------------------------------------------------------------
// - Sin país
// - Sin formalismos judiciales
// - Legible y profesional
// ============================================================================

export default function getNeutralLayout(doc) {
  return {
    renderCover({ title, subtitle, date }) {
      doc
        .fontSize(20)
        .text(title || "Informe jurídico", { align: "center" })
        .moveDown(1);

      if (subtitle) {
        doc.fontSize(12).text(subtitle, { align: "center" });
      }

      doc.moveDown(2);
      doc.fontSize(10).text(`Fecha: ${date}`, { align: "center" });
      doc.addPage();
    },

    renderSection(heading, content) {
      doc
        .fontSize(14)
        .text(heading, { underline: true })
        .moveDown(0.5);

      if (Array.isArray(content)) {
        content.forEach((item) => {
          doc.fontSize(11).text(`• ${item}`).moveDown(0.2);
        });
      } else {
        doc.fontSize(11).text(content || "—").moveDown();
      }

      doc.moveDown(1);
    },

    renderFooter(metadata) {
      doc.moveDown(2);
      doc
        .fontSize(9)
        .fillColor("gray")
        .text(
          metadata.footer ||
            "Documento generado por sistema jurídico automatizado.",
          { align: "center" }
        );
    },
  };
}
