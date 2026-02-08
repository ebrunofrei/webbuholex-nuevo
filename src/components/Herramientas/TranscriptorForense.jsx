// ============================================================================
// 🎙️ TranscriptorForense — FORENSE v3 (UPLOAD SERVER-SIDE)
// ----------------------------------------------------------------------------
// - Audio / Video → Texto crudo (SIN interpretar)
// - Upload multipart (sin base64)
// - Hash y custodia desde backend
// - Uso probatorio
// - Overlay visual INTACTO
// ============================================================================

import React, { useRef, useState } from "react";
import {
  Upload,
  X,
  FileAudio,
  FileVideo,
  Trash2,
  Copy,
  Check,
  Download,
} from "lucide-react";

// --------------------------------------------------
// Configuración
// --------------------------------------------------
const ACCEPTED_TYPES = [
  "audio/mpeg",
  "audio/wav",
  "audio/webm",
  "audio/mp4",
  "video/mp4",
  "video/webm",
  "video/quicktime",
];

// --------------------------------------------------
// Componente
// --------------------------------------------------
export default function TranscriptorForense({ onClose }) {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [transcription, setTranscription] = useState("");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [custody, setCustody] = useState(null);

  const abortRef = useRef(null);

  // --------------------------------------------------
  // Archivo
  // --------------------------------------------------
  function handleFileChange(e) {
    const f = e.target.files?.[0];
    if (!f) return;

    if (!ACCEPTED_TYPES.includes(f.type)) {
      setError("Formato no soportado. Usa un archivo de audio o video válido.");
      return;
    }

    setFile(f);
    setTranscription("");
    setCustody(null);
    setError("");
  }

  function removeFile() {
    setFile(null);
    setTranscription("");
    setCustody(null);
    setError("");
  }

  // --------------------------------------------------
  // Transcripción (UPLOAD SERVER-SIDE)
  // --------------------------------------------------
  async function handleTranscribe() {
    if (!file || loading) return;

    setLoading(true);
    setError("");
    setTranscription("");

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const form = new FormData();
      form.append("file", file);
      form.append("mode", "forense");

      const res = await fetch("/api/forense/upload", {
        method: "POST",
        body: form,
        signal: controller.signal,
      });

      const data = await res.json();

      if (!data?.ok) {
        throw new Error(data?.error || "Error en transcripción");
      }

      // 🔒 Texto crudo (forense)
      setTranscription(data.originalText || "");

      // 🔐 Custodia (backend)
      setCustody(data.custody || null);

    } catch (err) {
      if (err.name !== "AbortError") {
        setError("No fue posible transcribir el archivo.");
      }
    } finally {
      setLoading(false);
      abortRef.current = null;
    }
  }

  // --------------------------------------------------
  // Copiar texto
  // --------------------------------------------------
  async function copyText() {
    if (!transcription) return;
    await navigator.clipboard.writeText(transcription);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  // --------------------------------------------------
  // Exportar Word (HTML compatible)
  // --------------------------------------------------
  function exportWord() {
    if (!custody || !transcription) return;

    const html = `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8"/>
<title>Transcripción Forense</title>
<style>
body { font-family: Arial, sans-serif; font-size: 12pt; line-height: 1.6; }
h1 { font-size: 16pt; }
.meta { font-size: 10pt; color: #444; margin-bottom: 16px; }
.hash { font-family: monospace; font-size: 9pt; }
</style>
</head>
<body>

<h1>ACTA DE TRANSCRIPCIÓN (USO PROBATORIO)</h1>

<div class="meta">
Archivo: ${custody.fileName}<br/>
Tipo MIME: ${custody.mime}<br/>
Fecha: ${new Date(custody.createdAt).toLocaleString()}<br/>
Motor: ${custody.engine}<br/>
Hash SHA-256:<br/>
<span class="hash">${custody.sha256}</span>
</div>

<hr/>

${transcription
  .split("\n")
  .map((p) => `<p>${p}</p>`)
  .join("")}

</body>
</html>
    `.trim();

    const blob = new Blob([html], { type: "application/msword" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "transcripcion_forense.doc";
    a.click();

    URL.revokeObjectURL(url);
  }

  // --------------------------------------------------
  // Cierre
  // --------------------------------------------------
  function handleClose() {
    abortRef.current?.abort();
    setFile(null);
    setTranscription("");
    setCustody(null);
    setError("");
    setLoading(false);
    onClose?.();
  }

  const isVideo = file?.type?.startsWith("video/");

  // --------------------------------------------------
  // UI
  // --------------------------------------------------
  return (
    <div className="fixed inset-0 z-[9999] bg-white flex flex-col">
      {/* HEADER */}
      <header className="flex items-center justify-between px-6 py-4 border-b">
        <div>
          <div className="font-semibold text-sm">Transcriptor forense</div>
          <div className="text-xs opacity-60">
            Audio / Video · Texto fiel · Uso probatorio
          </div>
        </div>
        <button onClick={handleClose} className="p-2 rounded hover:bg-black/5">
          <X size={18} />
        </button>
      </header>

      {/* BODY */}
      <main className="flex-1 px-6 py-8 overflow-auto flex justify-center">
        <div className="w-full max-w-4xl space-y-6">

          {!file && (
            <label className="border border-dashed rounded-xl p-10 flex flex-col items-center gap-3 cursor-pointer hover:bg-gray-50">
              <Upload size={32} />
              <span className="text-sm opacity-70">
                Selecciona un archivo de audio o video
              </span>
              <input
                type="file"
                accept={ACCEPTED_TYPES.join(",")}
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
          )}

          {file && (
            <div className="border rounded-xl p-4 space-y-2">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2 text-sm">
                  {isVideo ? <FileVideo size={18} /> : <FileAudio size={18} />}
                  {file.name}
                </div>
                <button onClick={removeFile} className="hover:text-red-600">
                  <Trash2 size={16} />
                </button>
              </div>

              {isVideo && (
                <div className="text-xs opacity-70 pl-1">
                  <strong>Videos soportados:</strong> MP4, MOV, WebM · Códec recomendado: H.264 ·
                  Audio audible y continuo · Sin DRM.
                  <br />
                  El sistema extrae automáticamente el audio para la transcripción.
                </div>
              )}
            </div>
          )}

          {error && <div className="text-sm text-red-600">{error}</div>}

          {file && (
            <div className="flex justify-center">
              <button
                onClick={handleTranscribe}
                disabled={loading}
                className="px-8 py-3 rounded-lg bg-[#5C2E0B] text-white font-medium disabled:opacity-40"
              >
                {loading ? "Transcribiendo…" : "Transcribir"}
              </button>
            </div>
          )}

          {transcription && (
            <section className="bg-[#F7F1EC] rounded-xl p-6 space-y-3">
              <div className="flex justify-between items-center">
                <div className="text-xs opacity-60">
                  Transcripción forense (texto crudo)
                </div>
                <div className="flex gap-3 text-xs">
                  <button onClick={copyText} className="flex gap-1">
                    {copied ? <Check size={14} /> : <Copy size={14} />}
                    Copiar
                  </button>
                  <button onClick={exportWord} className="flex gap-1">
                    <Download size={14} /> Word
                  </button>
                </div>
              </div>

              <pre className="text-sm leading-relaxed whitespace-pre-wrap h-[50vh] overflow-auto bg-white rounded-lg p-4">
                {transcription}
              </pre>

              {custody && (
                <div className="text-xs opacity-60 pt-2 border-t">
                  Hash SHA-256: {custody.sha256}
                </div>
              )}
            </section>
          )}
        </div>
      </main>
    </div>
  );
}
