// ============================================================================
// 💬 MensajeUsuarioBubble — Conversación humana (UX-3.1 CANÓNICO)
// ----------------------------------------------------------------------------
// - Nota humana (no institucional)
// - Fondo gris neutro
// - Adjuntos discretos con mini-modal
// - Accesible (baja visión)
// ============================================================================

import React, { useState } from "react";
import {
  FileText,
  FileImage,
  FileSpreadsheet,
  FileType,
  Link as LinkIcon,
  X,
} from "lucide-react";

/* ------------------------------------------------------------
   Inferencia básica por tipo de adjunto
------------------------------------------------------------ */
function inferKind(adj) {
  if (!adj) return "other";

  const n = (adj.name || "").toLowerCase();
  const t = (adj.type || "").toLowerCase();

  if (t.startsWith("image/")) return "image";
  if (t.includes("pdf") || n.endsWith(".pdf")) return "pdf";
  if (t.includes("excel") || n.endsWith(".xls") || n.endsWith(".xlsx"))
    return "excel";
  if (t.includes("word") || n.endsWith(".doc") || n.endsWith(".docx"))
    return "word";
  if (adj.url) return "url";

  return "other";
}

function AdjuntoRow({ adj }) {
  const kind = inferKind(adj);

  const iconMap = {
    image: <FileImage size={18} />,
    pdf: <FileText size={18} />,
    excel: <FileSpreadsheet size={18} />,
    word: <FileType size={18} />,
    url: <LinkIcon size={18} />,
    other: <FileType size={18} />,
  };

  const label = adj.name || adj.url || "Archivo adjunto";

  if (kind === "url") {
    return (
      <a
        href={adj.url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-black/5"
      >
        {iconMap[kind]}
        <span className="truncate">{label}</span>
      </a>
    );
  }

  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg">
      {iconMap[kind]}
      <span className="truncate">{label}</span>
    </div>
  );
}

export default function MensajeUsuarioBubble({
  message,
  texto,
  adjuntos,
  id,
}) {

  const [showAdjuntos, setShowAdjuntos] = useState(false);
  // ============================
  // 🔑 NORMALIZACIÓN CANÓNICA
  // ============================
  const normalizedTexto =
    texto ??
    message?.texto ??
    message?.content ??
    message?.text ??
    message?.message ??
    "";

  const normalizedAdjuntos =
    adjuntos ??
    message?.adjuntos ??
    message?.attachments ??
    [];

  const hasAdjuntos =
    Array.isArray(normalizedAdjuntos) &&
    normalizedAdjuntos.length > 0;

  return (
    <div className="flex justify-end mb-6 select-text" key={id || undefined}>
      <div
        className="
          max-w-[680px]
          px-4 py-3
          rounded-xl
          border border-black/10
          bg-[#F5F5F5]
          text-black
          text-[15px] md:text-[16px]
          leading-relaxed
        "
      >
        {/* TEXTO */}
        {normalizedTexto && (
          <div className="whitespace-pre-wrap mb-2">
            {normalizedTexto}
          </div>
        )}

        {/* RESUMEN DE ADJUNTOS */}
        {hasAdjuntos && (
          <button
            onClick={() => setShowAdjuntos(true)}
            className="
              text-sm
              text-black/60
              hover:text-black
              underline
            "
          >
            📎 {adjuntos.length} archivo
            {adjuntos.length > 1 ? "s" : ""} adjunto
            {adjuntos.length > 1 ? "s" : ""}
          </button>
        )}
      </div>

      {/* MINI-MODAL ADJUNTOS */}
      {showAdjuntos && (
        <div
          className="
            fixed inset-0 z-50
            bg-black/30
            flex items-center justify-center
          "
          onClick={() => setShowAdjuntos(false)}
        >
          <div
            className="
              bg-white
              text-black
              w-[90%] max-w-md
              rounded-2xl
              shadow-lg
              p-4
            "
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="font-semibold text-base">
                Archivos adjuntos
              </div>
              <button
                onClick={() => setShowAdjuntos(false)}
                className="opacity-60 hover:opacity-100"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex flex-col gap-1 max-h-[50vh] overflow-y-auto">
              {normalizedAdjuntos.map((adj, idx) => (
                <AdjuntoRow key={idx} adj={adj} />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
