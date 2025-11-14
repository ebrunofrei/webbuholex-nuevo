import pdfParse from "pdf-parse";
import Noticia from "../models/Noticia.js";
import { openai } from "../services/openai.js";

export async function procesarDocumentoJurisprudencia(pdfPath) {

  // 1. Extraer texto
  const raw = await pdfParse(fs.readFileSync(pdfPath));
  const texto = raw.text || "";

  // 2. Llama a GPT para detectar metadata
  const metaResp = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{
      role: "user",
      content: `
Extrae esta metadata legal del documento:

- Título o casación
- Materia
- Órgano
- Fecha
- Número
- Sumilla
- Resumen breve
- Estado

Texto:
${texto.slice(0, 6000)}
      `
    }]
  });

  const metadata = JSON.parse(metaResp.choices[0].message.content);

  // 3. Embedding
  const emb = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: texto.slice(0, 8000)
  });

  metadata.embedding = emb.data[0].embedding;
  metadata.pdfPath = pdfPath;
  metadata.texto = texto;

  // 4. Guardar
  const doc = new Jurisprudencia(metadata);
  await doc.save();

  return doc;
}
