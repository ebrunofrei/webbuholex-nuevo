// ============================================================================
// 🦉 LitisBotToolsModal — Herramientas Jurídicas (Hardware puro)
// ----------------------------------------------------------------------------
// - NO contiene IA
// - NO ejecuta lógica
// - SOLO dispara eventos normalizados
// - Las herramientas inyectan contexto al chat
//
// Evento:
// window.dispatchEvent(
//   new CustomEvent("litisbot:tool", { detail: { tool } })
// )
//
// ============================================================================

import React from "react";
import { X, Mic, Scale, Globe, Languages } from "lucide-react";

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
          >
            <X size={20} />
          </button>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-2 gap-3">
          <ToolButton
            label="Audiencia (modo juicio)"
            icon={<Mic size={22} />}
            onClick={() => trigger("audiencia")}
          />

          <ToolButton
            label="Liquidación laboral"
            icon={<Scale size={22} />}
            onClick={() => trigger("liquidacion_laboral")}
          />

          <ToolButton
            label="Tercio de la pena"
            icon={<Scale size={22} />}
            onClick={() => trigger("tercio_pena")}
          />

          <ToolButton
            label="Traductor jurídico"
            icon={<Globe size={22} />}
            onClick={() => trigger("traductor_juridico")}
          />

          <ToolButton
            label="Multilingüe jurídico"
            icon={<Languages size={22} />}
            onClick={() => trigger("multilingue_juridico")}
          />
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Botón herramienta — Minimal Pro
// ============================================================================
function ToolButton({ label, icon, onClick }) {
  return (
    <button
      onClick={onClick}
      className="
        flex flex-col items-center justify-center gap-2
        p-4 rounded-xl border border-[#EFEFEF]
        hover:bg-[#FAFAFA] transition
      "
    >
      <div className="text-[#5C2E0B] opacity-80">{icon}</div>
      <span className="text-sm text-[#3A2A1A] text-center">
        {label}
      </span>
    </button>
  );
}
