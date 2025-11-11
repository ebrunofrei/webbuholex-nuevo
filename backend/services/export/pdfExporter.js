import PDFDocument from "pdfkit";
import concat from "concat-stream";

export async function exportPdf({ title, content, citations }) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 50 });
    doc.fontSize(18).text(title || "Informe LitisBot", { underline: true });
    doc.moveDown();

    doc.fontSize(11);
    String(content || "").split("\n").forEach(p => doc.text(p).moveDown(0.5));

    doc.moveDown();
    doc.fontSize(14).text("Citas", { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(10);
    (Array.isArray(citations) ? citations : []).forEach((c, i) => {
      doc.text(`${i + 1}. ${c.title} (${c.source})`);
      if (c.url) doc.fillColor("blue").text(c.url, { link: c.url, underline: true });
      doc.fillColor("black");
      if (c.date) doc.text(`Fecha: ${c.date}`);
      doc.moveDown(0.5);
    });

    doc.end();
    doc.pipe(concat((buf) => resolve(buf)));
    doc.on("error", reject);
  });
}
