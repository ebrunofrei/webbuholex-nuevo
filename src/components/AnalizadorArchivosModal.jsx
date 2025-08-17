import React, { useRef, useState } from "react";
import * as pdfjsLib from "pdfjs-dist/build/pdf";
import "pdfjs-dist/build/pdf.worker.entry";
import mammoth from "mammoth";

export default function AnalizadorArchivosModal({ visible, onClose, onAnalisis }) {
  const [uploading, setUploading] = useState(false);
  const [texto, setTexto] = useState("");
  const fileInputRef = useRef();

  async function handleFile(e) {
    setUploading(true);
    const file = e.target.files[0];
    if (!file) return setUploading(false);

    try {
      if (file.type === "application/pdf") {
        const reader = new FileReader();
        reader.onload = async function () {
          const typedarray = new Uint8Array(this.result);
          const pdf = await pdfjsLib.getDocument({ data: typedarray }).promise;
          let text = "";
          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const content = await page.getTextContent();
            text += content.items.map(item => item.str).join(" ") + "\n";
          }
          setTexto(text.slice(0, 3000));
          onAnalisis && onAnalisis(text.slice(0, 3000));
        };
        reader.readAsArrayBuffer(file);
      } else if (file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" || file.name.endsWith(".docx")) {
        const reader = new FileReader();
        reader.onload = async function () {
          const result = await mammoth.extractRawText({ arrayBuffer: reader.result });
          setTexto(result.value.slice(0, 3000));
          onAnalisis && onAnalisis(result.value.slice(0, 3000));
        };
        reader.readAsArrayBuffer(file);
      } else {
        setTexto("Tipo de archivo no soportado aún.");
      }
    } catch (err) {
      setTexto("Error al analizar el archivo.");
    }
    setUploading(false);
  }

  return (
    <div className={`fixed inset-0 bg-black/20 z-30 flex items-center justify-center ${visible ? "" : "hidden"}`}>
      <div className="bg-white rounded-2xl p-6 max-w-lg w-full border shadow">
        <div className="font-bold text-lg text-[#b03a1a] mb-3 flex justify-between">
          Analizar archivo
          <button onClick={onClose} className="text-2xl text-gray-400 hover:text-red-600">&times;</button>
        </div>
        <input type="file" ref={fileInputRef} className="mb-3" accept=".pdf,.docx" onChange={handleFile} disabled={uploading} />
        <div className="h-32 overflow-y-auto border rounded bg-gray-50 p-2 text-sm">{texto}</div>
        <button className="mt-3 px-3 py-1 rounded bg-[#b03a1a] text-white" onClick={onClose}>Cerrar</button>
      </div>
    </div>
  );
}
