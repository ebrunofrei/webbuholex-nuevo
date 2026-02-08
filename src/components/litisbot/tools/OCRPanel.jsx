// ============================================================================
// 🦉 OCRPanel — OCR Jurídico (UI pura, backend real)
// ----------------------------------------------------------------------------
// - Modal centrado (lectura)
// - NO IA
// - NO chat
// - OCR real vía backend
// - Copiar / Descargar texto
// ============================================================================

import React, { useState } from "react";
import { X, Upload, FileText, Copy, Download } from "lucide-react";

export default function OCRPanel({ open, onClose }) {
  if (!open) return null;

  const [file, setFile] = useState(null);
  const [textoExtraido, setTextoExtraido] = useState("");
  const [estado, setEstado] = useState("idle"); // idle | loading | done | error
  const [error, setError] = useState("");

  // ===============================
  // FILE SELECT
  // ===============================
  function onFileChange(e) {
    const f = e.target.files?.[0];
    if (!f) return;

    setFile(f);
    setTextoExtraido("");
    setEstado("idle");
    setError("");
  }

  // ===============================
  // OCR REAL (BACKEND)
  // ===============================
  async function extraerTexto() {
    if (!file) return;

    try {
      setEstado("loading");
      setError("");

      // ⚠️ En esta fase asumimos que el archivo
      // ya fue subido y tenemos una URL temporal.
      // Si aún no, esto se puede adaptar a multipart.
      const urlTemporal = URL.createObjectURL(file);

      const res = await fetch("/api/ocr/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: urlTemporal,
          filename: file.name,
          mimetype: file.type,
          save: false,
        }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        throw new Error(data.error || "Error al extraer texto");
      }

      setTextoExtraido(data.text);
      setEstado("done");
    } catch (err) {
      console.error(err);
      setEstado("error");
      setError("No se pudo extraer texto del documento.");
    }
  }

  // ===============================
  // ACCIONES USUARIO
  // ===============================
  function copiarTexto() {
    navigator.clipboard.writeText(textoExtraido);
  }

  function descargarTexto() {
    const blob = new Blob([textoExtraido], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = file?.name.replace(/\.[^/.]+$/, "") + "_OCR.txt";
    a.click();

    URL.revokeObjectURL(url);
  }

  // ===============================
  // RENDER
  // ===============================
  return (
    <div className="fixed inset-0 z-[9995] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white w-[94%] max-w-3xl rounded-2xl shadow-xl border border-[#EEE] animate-fadeIn">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-semibold text-[#3A2A1A]">
            OCR jurídico — extracción de texto
          </h2>

          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {/* Upload */}
          <div className="border border-dashed rounded-xl p-6 text-center">
            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.docx,.txt"
              onChange={onFileChange}
              className="hidden"
              id="ocr-upload"
            />

            <label
              htmlFor="ocr-upload"
              className="cursor-pointer flex flex-col items-center gap-2 text-sm text-gray-600"
            >
              <Upload className="opacity-70" />
              <span>
                {file ? file.name : "Sube un documento para extraer texto"}
              </span>
            </label>
          </div>

          {/* Acción */}
          <button
            onClick={extraerTexto}
            disabled={!file || estado === "loading"}
            className="w-full bg-[#5C2E0B] text-white py-2 rounded-lg font-semibold disabled:opacity-40"
          >
            {estado === "loading" ? "Extrayendo texto…" : "Extraer texto"}
          </button>

          {/* Error */}
          {estado === "error" && (
            <div className="text-sm text-red-600 text-center">
              {error}
            </div>
          )}

          {/* Resultado */}
          {estado === "done" && textoExtraido && (
            <div className="border rounded-xl p-4 bg-[#FAFAFA] max-h-[320px] overflow-auto">
              <div className="flex items-center justify-between mb-2 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <FileText size={16} />
                  Texto extraído
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={copiarTexto}
                    className="text-xs flex items-center gap-1 hover:underline"
                  >
                    <Copy size={14} /> Copiar
                  </button>
                  <button
                    onClick={descargarTexto}
                    className="text-xs flex items-center gap-1 hover:underline"
                  >
                    <Download size={14} /> Descargar
                  </button>
                </div>
              </div>

              <pre className="text-sm whitespace-pre-wrap text-gray-800 text-center">
                {textoExtraido}
              </pre>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t text-xs text-gray-500 text-center">
          El texto extraído es referencial. Verifica fidelidad antes de usarlo
          en escritos, demandas o expedientes.
        </div>
      </div>
    </div>
  );
}
