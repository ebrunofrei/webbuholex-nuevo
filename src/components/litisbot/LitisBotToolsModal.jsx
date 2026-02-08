// ============================================================================ 
// 🦉 LitisBotToolsModal — Herramientas Jurídicas (Hardware puro)
// ----------------------------------------------------------------------------
// - NO contiene IA
// - NO ejecuta lógica
// - SOLO dispara eventos normalizados
// - Herramientas = utilidades autónomas
//
// Evento estándar:
// window.dispatchEvent(
//   new CustomEvent("litisbot:tool", { detail: { tool } })
// )
//
// Herramientas activas:
// • Transcriptor forense (audio / video → texto)
// • OCR jurídico (documentos escaneados → texto)
// • Multilingüe jurídico (idiomas → texto)
//
// ============================================================================

import React from "react";
import {
  X,
  FileAudio,
  ScanText,
  Languages,
} from "lucide-react";

export default function LitisBotToolsModal({ open, onClose }) {
  if (!open) return null;

  const trigger = (tool) => {
    window.dispatchEvent(
      new CustomEvent("litisbot:tool", {
        detail: { tool },
      })
    );
    onClose?.();
  };

  return (
    <div className="fixed inset-0 z-[9990] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className="
          relative bg-white rounded-2xl shadow-xl
          w-[92%] max-w-md p-6
          border border-[#EEE]
          animate-fadeIn
        "
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-[#3A2A1A]">
            Herramientas jurídicas
          </h2>

          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100"
            aria-label="Cerrar"
          >
            <X size={20} />
          </button>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-2 gap-3">
          {/* 🎙️ TRANSCRIPTOR FORENSE */}
          <ToolButton
            label="Transcriptor forense"
            legend="Convierte audio o video en texto fiel"
            icon={<FileAudio size={22} />}
            onClick={() => trigger("transcriptor_forense")}
          />

          {/* 📄 OCR JURÍDICO */}
          <ToolButton
            label="OCR jurídico"
            legend="Extrae texto de documentos escaneados"
            icon={<ScanText size={22} />}
            onClick={() => trigger("ocr_juridico")}
          />

          {/* 🌐 MULTILINGÜE JURÍDICO */}
          <ToolButton
            label="Multilingüe jurídico"
            legend="Convierte contenido entre idiomas"
            icon={<Languages size={22} />}
            onClick={() => trigger("multilingue_juridico")}
          />
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Botón herramienta — Minimal Pro (con leyenda)
// ============================================================================
function ToolButton({ label, legend, icon, onClick }) {
  return (
    <button
      onClick={onClick}
      className="
        flex flex-col items-center justify-center gap-1
        p-4 rounded-xl border border-[#EFEFEF]
        hover:bg-[#FAFAFA] transition text-center
      "
    >
      <div className="text-[#5C2E0B] opacity-80">
        {icon}
      </div>

      <span className="text-sm font-medium text-[#3A2A1A]">
        {label}
      </span>

      {legend && (
        <span className="text-[11px] leading-snug text-[#6B5B4A] opacity-80">
          {legend}
        </span>
      )}
    </button>
  );
}
