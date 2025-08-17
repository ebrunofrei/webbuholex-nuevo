import fetch from "node-fetch";
import pdfParse from "pdf-parse";
import { consultarIA } from "./miServicioIA"; // tu lógica de IA

export async function analizarPDF(url, expediente, usuario) {
  // Descarga el archivo PDF
  const response = await fetch(url);
  const buffer = await response.buffer();
  const pdf = await pdfParse(buffer);

  // Llama a la IA con el contenido y contexto
  const prompt = `
    Analiza el siguiente documento PDF del expediente N° ${expediente.numero}:
    [Extracto del archivo]
    ${pdf.text.substring(0, 3500)}
    [Fin del extracto]
    Identifica si es sentencia, auto, demanda, escrito, etc.
    Resume el contenido, identifica riesgos y sugiere la mejor acción procesal.
  `;

  return await consultarIA(prompt);
}
