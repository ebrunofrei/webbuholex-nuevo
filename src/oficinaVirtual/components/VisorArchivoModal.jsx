import React, { useEffect, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import Tesseract from "tesseract.js";
import "react-pdf/dist/esm/Page/AnnotationLayer.css";
import "react-pdf/dist/esm/Page/TextLayer.css";
import { useLitisBot } from "@/context/LitisBotContext.jsx";

pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.js`;

export default function VisorArchivoModal({ open, onClose, archivo, expediente, archivosEnCarpeta = [] }) {
  const [numPages, setNumPages] = useState(null);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrResult, setOcrResult] = useState("");
  const { abrirBot } = useLitisBot();

  const actualIdx = archivosEnCarpeta?.findIndex(a => a.name === archivo?.name) ?? -1;
  const prevFile = actualIdx > 0 ? archivosEnCarpeta[actualIdx - 1] : null;
  const nextFile = actualIdx >= 0 && actualIdx < archivosEnCarpeta.length - 1 ? archivosEnCarpeta[actualIdx + 1] : null;

  useEffect(() => {
    setNumPages(null);
    setOcrResult("");
    setOcrLoading(false);
  }, [archivo]);

  if (!open || !archivo) return null;

  const ext = archivo.name.split(".").pop().toLowerCase();
  const isWord = ext === "doc" || ext === "docx";
  const isPdf = ext === "pdf";
  const isImage = ["jpg", "jpeg", "png", "bmp", "tiff", "gif"].includes(ext);
  const isAudio = ["mp3", "wav", "ogg"].includes(ext);
  const isVideo = ["mp4", "webm", "mov"].includes(ext);
  const wordUrl = `https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(archivo.url)}`;

  const handleOcr = async () => {
    setOcrLoading(true);
    setOcrResult("");
    try {
      const { data } = await Tesseract.recognize(archivo.url, "spa");
      setOcrResult(data.text);
    } catch (err) {
      setOcrResult("Error al extraer texto. Intenta con otra imagen o formato.");
    }
    setOcrLoading(false);
  };

  const transcribirAV = async () => {
    setOcrLoading(true);
    setOcrResult("");
    try {
      const simulado = `Transcripción simulada del archivo ${archivo.name} para análisis legal.`;
      setOcrResult(simulado);
    } catch (err) {
      setOcrResult("Error al transcribir audio/video.");
    }
    setOcrLoading(false);
  };

  const analizarConLitisBot = (texto) => {
    abrirBot({ archivo: { ...archivo, contenido: texto }, expediente });
    onClose && onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-60 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-lg max-w-3xl w-full relative p-4">
        <button
          className="absolute top-2 right-2 text-xl font-bold text-red-600"
          onClick={onClose}
        >✖</button>

        <div className="flex items-center justify-between mb-2">
          <button
            disabled={!prevFile}
            className={`px-3 py-1 rounded text-xl font-bold ${
              prevFile ? "text-blue-600 hover:bg-blue-50" : "text-gray-300 cursor-not-allowed"
            }`}
            onClick={() => prevFile && prevFile.onPreview()}
            title="Anterior"
          >◀</button>
          <h3 className="text-lg font-bold truncate max-w-xs text-center flex-1">{archivo.name}</h3>
          <button
            disabled={!nextFile}
            className={`px-3 py-1 rounded text-xl font-bold ${
              nextFile ? "text-blue-600 hover:bg-blue-50" : "text-gray-300 cursor-not-allowed"
            }`}
            onClick={() => nextFile && nextFile.onPreview()}
            title="Siguiente"
          >▶</button>
        </div>

        {isPdf && (
          <div className="flex flex-col items-center">
            <Document
              file={archivo.url}
              onLoadSuccess={({ numPages }) => setNumPages(numPages)}
              loading={<p>Cargando PDF...</p>}
            >
              {Array.from({ length: numPages || 0 }, (_, i) => (
                <Page key={i + 1} pageNumber={i + 1} width={650} />
              ))}
            </Document>
          </div>
        )}

        {isWord && (
          <iframe
            src={wordUrl}
            title={archivo.name}
            width="100%"
            height="600px"
            className="border rounded"
          />
        )}

        {isImage && (
          <div className="flex flex-col items-center justify-center">
            <img src={archivo.url} alt={archivo.name} className="max-h-96 mx-auto border mb-4" />
            <button
              onClick={handleOcr}
              disabled={ocrLoading}
              className="bg-blue-700 text-white px-4 py-2 rounded hover:bg-blue-800"
            >
              {ocrLoading ? "Extrayendo texto..." : "Extraer texto (OCR)"}
            </button>
            {ocrResult && (
              <div className="mt-4 w-full">
                <h3 className="font-bold mb-2">Texto extraído:</h3>
                <textarea
                  className="w-full border rounded p-2 bg-gray-100"
                  rows={8}
                  value={ocrResult}
                  readOnly
                />
                <button
                  className="mt-2 bg-green-700 text-white px-4 py-2 rounded hover:bg-green-800"
                  onClick={() => analizarConLitisBot(ocrResult)}
                >
                  Analizar texto con LitisBot
                </button>
              </div>
            )}
          </div>
        )}

        {isAudio && (
          <div className="flex flex-col items-center">
            <audio controls src={archivo.url} className="w-full my-4" />
            <button
              onClick={transcribirAV}
              disabled={ocrLoading}
              className="bg-blue-700 text-white px-4 py-2 rounded hover:bg-blue-800"
            >
              {ocrLoading ? "Transcribiendo..." : "Transcribir y Analizar"}
            </button>
            {ocrResult && (
              <div className="mt-4 w-full">
                <h3 className="font-bold mb-2">Texto transcrito:</h3>
                <textarea
                  className="w-full border rounded p-2 bg-gray-100"
                  rows={8}
                  value={ocrResult}
                  readOnly
                />
                <button
                  className="mt-2 bg-green-700 text-white px-4 py-2 rounded hover:bg-green-800"
                  onClick={() => analizarConLitisBot(ocrResult)}
                >
                  Analizar texto con LitisBot
                </button>
              </div>
            )}
          </div>
        )}

        {isVideo && (
          <div className="flex flex-col items-center">
            <video controls src={archivo.url} className="w-full max-h-[480px] rounded mb-4" />
            <button
              onClick={transcribirAV}
              disabled={ocrLoading}
              className="bg-blue-700 text-white px-4 py-2 rounded hover:bg-blue-800"
            >
              {ocrLoading ? "Transcribiendo..." : "Transcribir y Analizar"}
            </button>
            {ocrResult && (
              <div className="mt-4 w-full">
                <h3 className="font-bold mb-2">Texto transcrito:</h3>
                <textarea
                  className="w-full border rounded p-2 bg-gray-100"
                  rows={8}
                  value={ocrResult}
                  readOnly
                />
                <button
                  className="mt-2 bg-green-700 text-white px-4 py-2 rounded hover:bg-green-800"
                  onClick={() => analizarConLitisBot(ocrResult)}
                >
                  Analizar texto con LitisBot
                </button>
              </div>
            )}
          </div>
        )}

        {!isPdf && !isWord && !isImage && !isAudio && !isVideo && (
          <div className="flex flex-col items-center justify-center p-8">
            <span className="text-6xl text-gray-300 mb-2">📄</span>
            <a
              href={archivo.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-700 underline"
            >
              Ver o descargar archivo
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
