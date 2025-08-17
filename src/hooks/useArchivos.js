import { useRef } from "react";
import * as pdfjsLib from "pdfjs-dist/build/pdf";
import mammoth from "mammoth";

// Modulariza la subida y análisis de archivos
export function useArchivos({ setInput, setError }) {
  const uploading = false;
  const handleFileChange = async (e) => {
    setError("");
    const file = e.target.files[0];
    if (!file) return;
    try {
      if (file.type === "application/pdf") {
        const reader = new FileReader();
        reader.onload = async function () {
          const typedarray = new Uint8Array(this.result);
          const pdf = await pdfjsLib.getDocument({ data: typedarray }).promise;
          let fullText = "";
          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            fullText += textContent.items.map(item => item.str).join(" ") + "\n";
          }
          setInput(fullText.slice(0, 3000));
        };
        reader.readAsArrayBuffer(file);
        return;
      }
      if (
        file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
        file.name.endsWith(".docx")
      ) {
        const reader = new FileReader();
        reader.onload = async function () {
          const result = await mammoth.extractRawText({ arrayBuffer: reader.result });
          setInput(result.value.slice(0, 3000));
        };
        reader.readAsArrayBuffer(file);
        return;
      }
      if (file.type.startsWith("image/")) {
        setError("OCR sobre imágenes próximamente.");
        return;
      }
      if (file.type.startsWith("audio/")) {
        setError("Transcripción de audio solo disponible en backend.");
        return;
      }
      if (file.type.startsWith("video/")) {
        setError("Transcripción de video estará disponible pronto.");
        return;
      }
      setError("Tipo de archivo no soportado todavía.");
    } catch (err) {
      setError("Ocurrió un error al procesar el archivo.");
    }
  };
  return { handleFileChange, uploading };
}
