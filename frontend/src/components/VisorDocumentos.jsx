import React, { useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import * as docxPreview from "docx-preview";

pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

export default function VisorDocumentos() {
  const [archivo, setArchivo] = useState(null);
  const [docWordHtml, setDocWordHtml] = useState("");

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setArchivo(file);
    const ext = file.name.split(".").pop().toLowerCase();

    if (ext === "docx") {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const arrayBuffer = event.target.result;
        const container = document.createElement("div");
        await docxPreview.renderAsync(arrayBuffer, container);
        setDocWordHtml(container.innerHTML);
      };
      reader.readAsArrayBuffer(file);
    }
  };

  return (
    <div className="max-w-4xl mx-auto bg-white shadow rounded p-6">
      <h2 className="text-2xl font-semibold mb-4 text-gray-800">Visualizador de Documentos</h2>

      <input
        type="file"
        accept=".pdf,.docx"
        onChange={handleFileChange}
        className="mb-4"
      />

      {archivo && archivo.name.endsWith(".pdf") && (
        <Document file={archivo} onLoadError={console.error}>
          <Page pageNumber={1} />
        </Document>
      )}

      {archivo && archivo.name.endsWith(".docx") && (
        <div
          className="prose max-w-none border rounded p-4 bg-gray-50"
          dangerouslySetInnerHTML={{ __html: docWordHtml }}
        />
      )}
    </div>
  );
}
