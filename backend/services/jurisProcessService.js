// backend/services/procesarDocumentoJurisprudencia.js
// ============================================================
// 🦉 BúhoLex | Ingesta de PDFs de Jurisprudencia
// - Extrae texto de un PDF
// - Llama a GPT para obtener metadata básica en JSON
// - Crea un documento Jurisprudencia en MongoDB
// ============================================================

import fs from "fs";
import pdfParse from "pdf-parse";

import Jurisprudencia from "../models/Jurisprudencia.js";
import { callOpenAI } from "./openaiService.js"; // usa tu helper centralizado
import { normalizeJurisprudencia } from "../services/jurisprudenciaNormalizer.js";

/**
 * Procesa un PDF de jurisprudencia y lo guarda en la colección Jurisprudencia.
 *
 * @param {string} pdfPath - Ruta absoluta o relativa al archivo PDF.
 * @returns {Promise<Jurisprudencia>} Documento guardado en MongoDB.
 */
export async function procesarDocumentoJurisprudencia(pdfPath) {
  // 1. Leer y extraer texto del PDF
  const buffer = fs.readFileSync(pdfPath);
  const raw = await pdfParse(buffer);
  const texto = (raw.text || "").trim();

  if (!texto) {
    throw new Error(
      `[Jurisprudencia] El PDF no contiene texto legible: ${pdfPath}`
    );
  }

  // 2. Pedir a GPT metadata en formato JSON robusto
  const userPrompt = `
Eres un asistente jurídico. A partir del siguiente texto de una resolución
judicial, extrae y devuelve ÚNICAMENTE un JSON con esta estructura:

{
  "titulo": "string",
  "materia": "string",
  "organo": "string",
  "fechaResolucion": "YYYY-MM-DD",
  "numeroExpediente": "string",
  "sumilla": "string",
  "resumen": "string",
  "estado": "string"
}

- "titulo": puede ser la casación, proceso o nombre identificador.
- "materia": área (Civil, Penal, Laboral, Constitucional, etc.).
- "organo": sala, instancia o tribunal que emite la resolución.
- "fechaResolucion": intenta detectar la fecha de la resolución.
- "numeroExpediente": el número de expediente si se identifica.
- "sumilla": una sumilla breve, 1 a 3 líneas máximo.
- "resumen": resumen descriptivo de la resolución, 3 a 6 líneas.
- "estado": usa algo genérico como "publicado" o "vigente" si no se indica.

Si no encuentras algún dato, deja el campo como cadena vacía "".

TEXTO (recortado):
${texto.slice(0, 6000)}
  `.trim();

  // 👉 Aquí asumo que callOpenAI devuelve el contenido del mensaje (string)
  // Si tu helper devuelve el objeto completo, solo adapta la línea correspondiente.
  const metaContent = await callOpenAI({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content:
          "Eres un asistente experto en derecho peruano. Respondes SIEMPRE en formato JSON válido.",
      },
      { role: "user", content: userPrompt },
    ],
    // Idealmente tu helper ya maneja response_format,
    // si no, puedes parsear el texto a mano.
    response_format: { type: "json_object" },
    temperature: 0.1,
  });

  let metadata;
  try {
    // metaContent puede ser string con JSON o ya un objeto;
    // cubrimos ambos casos para evitar errores.
    metadata =
      typeof metaContent === "string"
        ? JSON.parse(metaContent)
        : metaContent;
  } catch (err) {
    console.error("[Jurisprudencia] Error parseando metadata JSON:", err);
    throw new Error("No se pudo parsear la metadata devuelta por GPT.");
  }

  // 3. Armar el payload para el modelo Jurisprudencia
  // No asumimos todos los campos del schema: solo los más obvios.
  const payload = {
    // Core metadata
    titulo: metadata.titulo || "",
    materia: metadata.materia || "",
    organo: metadata.organo || "",
    fechaResolucion: metadata.fechaResolucion
      ? new Date(metadata.fechaResolucion)
      : undefined,
    numeroExpediente: metadata.numeroExpediente || "",
    sumilla: metadata.sumilla || "",
    resumen: metadata.resumen || "",
    estado: metadata.estado || "publicado",

    // Texto de trabajo para LitisBot (no probatorio)
    textoIA: texto,
    esTextoOficial: false,

    // Opcional: marca de origen para distinguir ingestas manuales
    origen: "UPLOAD_MANUAL",
    fuente: "Carga manual PDF",
    pdfLocalPath: pdfPath,
  };

  // 4. Guardar en MongoDB
  const { normalized } = normalizeJurisprudencia(payload);
  const doc = new Jurisprudencia(normalized);
  await doc.save();
  return doc;
  }
