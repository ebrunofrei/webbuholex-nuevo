import { OpenAI } from "openai";
import pdfParse from "pdf-parse";
import mammoth from "mammoth";
import XLSX from "xlsx";
import pptx2json from "pptx2json";
import { createWorker } from "tesseract.js";
import { Storage } from "@google-cloud/storage";
import fetch from "node-fetch";
import fs from "fs";

// Configuración (variables de entorno)
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const storage = new Storage({
  projectId: process.env.GCP_PROJECT_ID,
  credentials: JSON.parse(process.env.GCP_CREDENTIALS),
});
const bucketName = process.env.BUCKET_NAME;

// Sube archivo a GCS y devuelve URL pública
async function saveToStorageAndGetUrl(filename, buffer, mimetype = "text/plain") {
  const file = storage.bucket(bucketName).file("resultados_ia/" + filename);
  await file.save(buffer, { contentType: mimetype });
  await file.makePublic();
  return `https://storage.googleapis.com/${bucketName}/resultados_ia/${filename}`;
}

// Audio (Whisper OpenAI)
async function audioToTextOpenAI(buffer, nombre, tipo) {
  const tempFilePath = `/tmp/${nombre}`;
  fs.writeFileSync(tempFilePath, buffer);

  try {
    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(tempFilePath),
      model: "whisper-1",
      response_format: "text",
    });
    return transcription;
  } finally {
    fs.unlinkSync(tempFilePath);
  }
}

// OCR imágenes (tesseract.js)
async function ocrImage(buffer) {
  const worker = await createWorker("eng+spa");
  await worker.loadLanguage("eng+spa");
  await worker.initialize("eng+spa");
  const { data } = await worker.recognize(buffer);
  await worker.terminate();
  return data.text || "";
}

async function docxToText(buffer) {
  const { value } = await mammoth.extractRawText({ buffer });
  return value;
}

function xlsxToText(buffer) {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  let texto = "";
  workbook.SheetNames.forEach(sheetName => {
    const sheet = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1 });
    sheet.forEach(row => {
      texto += row.join(" | ") + "\n";
    });
  });
  return texto;
}

async function pptxToText(buffer) {
  const tempPath = `/tmp/temp-${Date.now()}.pptx`;
  fs.writeFileSync(tempPath, buffer);

  try {
    const slides = await pptx2json(tempPath);
    let texto = "";
    slides.forEach(slide => {
      slide.texts.forEach(txt => {
        texto += txt.text + "\n";
      });
    });
    return texto;
  } catch (err) {
    return "";
  } finally {
    fs.unlinkSync(tempPath);
  }
}

// --- Actualiza: Soporta más tipos de archivos, OCR, Audio, etc.
async function extractTextByType(buffer, nombre, tipo) {
  if (tipo.includes("pdf")) {
    const data = await pdfParse(buffer);
    return data.text;
  }
  if (tipo.includes("word") || tipo.includes("docx") || nombre.endsWith(".doc") || nombre.endsWith(".docx")) {
    return await docxToText(buffer);
  }
  if (tipo.includes("excel") || tipo.includes("spreadsheet") || nombre.endsWith(".xlsx") || nombre.endsWith(".xls")) {
    return xlsxToText(buffer);
  }
  if (tipo.includes("powerpoint") || tipo.includes("presentation") || nombre.endsWith(".pptx") || nombre.endsWith(".ppt")) {
    return await pptxToText(buffer);
  }
  if (tipo.startsWith("image/") || [".jpg", ".jpeg", ".png"].some(ext => nombre.endsWith(ext))) {
    return await ocrImage(buffer);
  }
  if (tipo.startsWith("audio/") || [".mp3", ".wav", ".m4a", ".ogg"].some(ext => nombre.endsWith(ext))) {
    return await audioToTextOpenAI(buffer, nombre, tipo);
  }
  if (tipo.includes("text") || nombre.endsWith(".txt")) {
    return buffer.toString("utf8");
  }
  return "";
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ success: false, message: "Method not allowed" });
    return;
  }

  try {
    const { url, nombre, tipo } = req.body;
    if (!url || !nombre || !tipo) throw new Error("Faltan parámetros");

    // Descargar archivo
    const response = await fetch(url);
    if (!response.ok) throw new Error("No se pudo descargar el archivo original");
    const buffer = Buffer.from(await response.arrayBuffer());

    // --- Validación de peso y tipo ---
    const MAX_SIZE_EXCEL = 2 * 1024 * 1024; // 2MB
    const MAX_SIZE_OTHER = 5 * 1024 * 1024; // 5MB

    const ext = nombre.split('.').pop().toLowerCase();
    const excelExts = ['xlsx', 'xls'];
    const allowedExts = [
      'pdf', 'docx', 'doc', 'pptx', 'ppt', 'txt',
      'xlsx', 'xls', 'jpg', 'jpeg', 'png', 'mp3', 'wav', 'ogg', 'm4a'
    ];

    if (!allowedExts.includes(ext)) {
      return res.status(400).json({
        success: false,
        resumen: "Tipo de archivo no permitido.",
        archivoAnalizadoUrl: null,
      });
    }
    if (excelExts.includes(ext) && buffer.length > MAX_SIZE_EXCEL) {
      return res.status(400).json({
        success: false,
        resumen: "El archivo Excel supera el límite de 2 MB. Por favor, sube un archivo más pequeño.",
        archivoAnalizadoUrl: null,
      });
    }
    if (!excelExts.includes(ext) && buffer.length > MAX_SIZE_OTHER) {
      return res.status(400).json({
        success: false,
        resumen: "El archivo supera el límite de 5 MB. Por favor, sube un archivo más pequeño.",
        archivoAnalizadoUrl: null,
      });
    }
    // --- FIN VALIDACIÓN ---

    // Extraer texto/OCR/Transcribir
    let texto = await extractTextByType(buffer, nombre, tipo);

    if (!texto || texto.trim().length < 10) {
      throw new Error("No se pudo extraer texto significativo del archivo");
    }

    // Prompt IA minimalista y profesional
    const prompt = `Haz un resumen jurídico profesional, claro, técnico y útil para abogados del siguiente documento:\n\n${texto.slice(0, 8000)}`;
    const completion = await openai.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "gpt-4o",
      max_tokens: 800,
    });
    const summary = completion.choices[0].message.content.trim();

    // Crea y sube archivo resultado
    const resultFileName = nombre.replace(/\.[^/.]+$/, "") + "-resumen.txt";
    const resultFileBuffer = Buffer.from(summary, "utf8");
    const archivoAnalizadoUrl = await saveToStorageAndGetUrl(resultFileName, resultFileBuffer, "text/plain");

    // Devuelve resumen y link
    res.status(200).json({
      success: true,
      resumen: summary,
      archivoAnalizadoUrl,
    });
  } catch (error) {
    console.error("Error en analizar-archivo:", error);
    res.status(500).json({
      success: false,
      resumen: "Ocurrió un error al analizar el archivo.",
      archivoAnalizadoUrl: null,
    });
  }
}
