const express = require("express");
const router = express.Router();
const { OpenAI } = require("openai");
const fetch = require("node-fetch");

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Utilidad: descargar texto del archivo.
 * Si es PDF, podrías usar pdf-parse o similar. Para Word, usa mammoth, etc.
 * Aquí asumimos solo PDF/Word ya extraído, o el frontend envía el texto plano.
 */
async function fetchDocumentText(url, tipo) {
  // Aquí solo DEMO: solo PDFs como texto plano
  if (tipo && tipo.includes("pdf")) {
    const pdfParse = require("pdf-parse");
    const res = await fetch(url);
    const buffer = await res.buffer();
    const data = await pdfParse(buffer);
    return data.text?.slice(0, 16000); // Limita tokens
  }
  // Para Word: usa "mammoth"
  if (tipo && tipo.includes("word")) {
    const mammoth = require("mammoth");
    const res = await fetch(url);
    const buffer = await res.buffer();
    const { value } = await mammoth.extractRawText({ buffer });
    return value.slice(0, 16000);
  }
  // Por defecto, intenta como texto plano
  const res = await fetch(url);
  return await res.text();
}

router.post("/accion", async (req, res) => {
  try {
    const { url, nombre, accion, tipo } = req.body;

    // 1. Extrae texto del archivo
    const texto = await fetchDocumentText(url, tipo);

    // 2. Define el prompt según acción
    let prompt = "";
    if (accion === "analizar") {
      prompt = `Analiza el siguiente documento jurídico y resume sus partes clave en lenguaje claro para abogados. Si puedes, sugiere acciones legales:\n\n${texto}`;
    } else if (accion === "resumir") {
      prompt = `Resume el siguiente documento jurídico con puntos principales, partes involucradas, fecha y conclusión:\n\n${texto}`;
    } else if (accion === "extraer_normas") {
      prompt = `Lee el siguiente documento y extrae todas las normas legales, artículos, leyes o códigos que se mencionan. Haz un listado breve con fuente y número de artículo:\n\n${texto}`;
    } else if (accion === "generar_escrito") {
      prompt = `Con base en el siguiente documento jurídico, redacta un modelo de escrito profesional que un abogado podría presentar al juzgado o autoridad correspondiente:\n\n${texto}`;
    } else {
      prompt = `Analiza y resume el siguiente texto jurídico:\n\n${texto}`;
    }

    // 3. Envía a OpenAI
    const completion = await openai.chat.completions.create({
      model: "gpt-4o", // O "gpt-4", "gpt-3.5-turbo"
      messages: [
        { role: "system", content: "Eres un asistente jurídico experto en documentos legales y procesales de Perú." },
        { role: "user", content: prompt }
      ],
      max_tokens: 2000,
      temperature: 0.3,
    });

    // 4. Devuelve resultado
    res.json({ resultado: completion.choices[0].message.content });
  } catch (err) {
    console.error("LitisBot error:", err);
    res.status(500).json({ resultado: "Error procesando el documento." });
  }
});

module.exports = router;
