import pdfParse from "pdf-parse";
import mammoth from "mammoth";
import XLSX from "xlsx";
import pptx2json from "pptx2json";
import { createWorker } from "tesseract.js";
import fs from "fs";

export async function extractTextByType(buffer, filename, mimetype) {
  const ext = filename.toLowerCase();

  if (mimetype.includes("pdf")) {
    const data = await pdfParse(buffer);
    return data.text;
  }

  if (ext.endsWith(".doc") || ext.endsWith(".docx")) {
    const { value } = await mammoth.extractRawText({ buffer });
    return value;
  }

  if (ext.endsWith(".xls") || ext.endsWith(".xlsx")) {
    const wb = XLSX.read(buffer, { type: "buffer" });
    let text = "";
    wb.SheetNames.forEach(name => {
      const rows = XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1 });
      rows.forEach(r => (text += r.join(" | ") + "\n"));
    });
    return text;
  }

  if (ext.endsWith(".ppt") || ext.endsWith(".pptx")) {
    const temp = `/tmp/${Date.now()}.pptx`;
    fs.writeFileSync(temp, buffer);
    const slides = await pptx2json(temp);
    fs.unlinkSync(temp);
    return slides.flatMap(s => s.texts.map(t => t.text)).join("\n");
  }

  if (mimetype.startsWith("image/")) {
    const worker = await createWorker("spa+eng");
    const { data } = await worker.recognize(buffer);
    await worker.terminate();
    return data.text;
  }

  if (mimetype.includes("text")) {
    return buffer.toString("utf8");
  }

  return "";
}
