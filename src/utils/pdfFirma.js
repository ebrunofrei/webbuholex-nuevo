import jsPDF from "jspdf";
import QRCode from "qrcode";

export async function generarPDFConFirmaYQR({ textoDocumento, firmaUrl, datosAbogado, onFinish }) {
  const doc = new jsPDF({ unit: "pt", format: "A4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 60;

  // Texto principal
  const textLines = doc.splitTextToSize(textoDocumento, pageWidth - 80);
  doc.text(textLines, 40, y);
  y += textLines.length * 14 + 20;

  doc.text("Atentamente,", 40, y);
  y += 26;

  // Firma escaneada
  if (firmaUrl) {
    const firmaImg = await toDataURL(firmaUrl);
    doc.addImage(firmaImg, "PNG", 40, y, 140, 50, "", "FAST");
  }
  doc.text([
    datosAbogado.nombre || "",
    datosAbogado.colegiatura ? `C.A.: ${datosAbogado.colegiatura}` : "",
    datosAbogado.email || "",
  ].filter(Boolean), 40, y + 68);

  // Hash + QR
  const textoParaFirmar = textoDocumento + "|" + datosAbogado.nombre + "|" + (new Date()).toISOString();
  const hash = simpleHash(textoParaFirmar);
  const urlValidacion = `https://buholex.com/valida?hash=${hash}`;
  const qrDataUrl = await QRCode.toDataURL(urlValidacion);
  doc.addImage(qrDataUrl, "PNG", pageWidth - 100, y, 60, 60, "", "FAST");

  // Hash en el pie
  doc.setFontSize(8);
  doc.text(`Hash de seguridad: ${hash}`, 40, doc.internal.pageSize.getHeight() - 24);

  doc.save(`Escrito-firmado.pdf`);
  if (onFinish) onFinish(hash);
}

// Helpers
function toDataURL(url) {
  return fetch(url)
    .then(res => res.blob())
    .then(blob => new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.readAsDataURL(blob);
    }));
}
function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(16);
}
