// ============================================================================
// 🦉 OCRPanel — OCR Jurídico (Overlay Autónomo)
// ----------------------------------------------------------------------------
// - UI pura (modal)
// - OCR real vía backend
// - NO IA
// - NO altera el chat
// - Inserta texto SOLO por evento
// ============================================================================

import React, { useState } from "react";
import { Upload, FileText, Loader2, X } from "lucide-react";

// Proxy-safe (dev / prod)
const OCR_ENDPOINT = "/api/ocr/extract";

export default function OCRPanel({ open, onClose }) {
  if (!open) return null;

  const [file, setFile] = useState(null);
  const [texto, setTexto] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // =========================
  // FILE SELECT
  // =========================
  function onFileChange(e) {
    const f = e.target.files?.[0];
    if (!f) return;

    setFile(f);
    setTexto("");
    setError("");
  }

  // =========================
  // OCR ACTION
  // =========================
  async function ejecutarOCR() {
    if (!file || loading) return;

    setLoading(true);
    setError("");
    setTexto("");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(OCR_ENDPOINT, {
        method: "POST",
        body: formData,
      });

      let payload = {};
      try {
        payload = await res.json();
      } catch (_) {}

      if (!res.ok) {
        throw new Error(
          payload?.message ||
          payload?.error ||
          `Error OCR (${res.status})`
        );
      }

      const textoExtraido =
        payload?.text ||
        payload?.texto ||
        payload?.data ||
        "";

      if (!textoExtraido || textoExtraido.trim().length < 5) {
        throw new Error(
          "No se pudo extraer texto significativo del documento."
        );
      }

      setTexto(textoExtraido);
    } catch (err) {
      console.error("OCR error:", err);
      setError(err.message || "Error inesperado en OCR");
    } finally {
      setLoading(false);
    }
  }

  // =========================
  // INSERT INTO CHAT (EVENT)
  // =========================
  function insertarEnChat() {
    if (!texto) return;

    window.dispatchEvent(
      new CustomEvent("litisbot:ocr", {
        detail: {
          text: texto,
          source: "ocr",
          filename: file?.name || "documento",
        },
      })
    );

    onClose?.();
  }

  // =========================
  // RENDER (MODAL OVERLAY)
  // =========================
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white w-[92%] max-w-2xl rounded-2xl shadow-xl p-6 animate-fadeIn">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-[#3A2A1A]">
            OCR jurídico
          </h2>

          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100"
          >
            <X size={18} />
          </button>
        </div>

        {/* Description */}
        <p className="text-sm text-gray-600 text-center mb-4">
          Convierte documentos escaneados (PDF o imagen) en texto editable.
        </p>

        {/* Upload */}
        <label className="flex items-center justify-center gap-2 cursor-pointer border border-dashed rounded-xl p-4 hover:bg-gray-50">
          <Upload size={18} />
          <span className="text-sm underline">
            {file ? file.name : "Subir documento para OCR"}
          </span>
          <input
            type="file"
            accept="image/*,application/pdf"
            className="hidden"
            onChange={onFileChange}
          />
        </label>

        {/* Action */}
        <button
          onClick={ejecutarOCR}
          disabled={!file || loading}
          className="mt-4 w-full bg-[#5C2E0B] text-white py-2 rounded font-bold disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading && <Loader2 className="animate-spin" size={16} />}
          {loading ? "Extrayendo texto…" : "Ejecutar OCR"}
        </button>

        {/* Error */}
        {error && (
          <div className="mt-3 text-sm text-red-600 text-center">
            {error}
          </div>
        )}

        {/* Result */}
        {texto && (
          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-center gap-2 text-sm font-semibold">
              <FileText size={16} />
              Texto extraído
            </div>

            <textarea
              value={texto}
              readOnly
              rows={10}
              className="w-full border rounded p-3 text-sm whitespace-pre-wrap"
            />

            <button
              onClick={insertarEnChat}
              className="w-full bg-green-700 text-white py-2 rounded font-bold"
            >
              Insertar en el chat
            </button>
          </div>
        )}

        <div className="text-xs text-gray-500 text-center pt-4">
          El texto OCR es referencial. Verifica fidelidad antes de usarlo en
          escritos o expedientes.
        </div>
      </div>
    </div>
  );
}
