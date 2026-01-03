// ============================================================================
// 🦉 ToolsModalQuickActions (Enterprise – Minimal Pro UI)
// ----------------------------------------------------------------------------
// Modal ligero de acciones rápidas para abogados:
// - Resumen instantáneo
// - Transformar texto
// - Extraer hechos / pretensiones
// - Analizar adjuntos
// - Redacción rápida
//
// No contiene IA. NO procesa nada. Solo dispara eventos:
//
//   window.dispatchEvent(
//     new CustomEvent("litisbot:quick", { detail: { action } })
//   );
//
// El Engine escucha y actúa.
// ============================================================================

import React from "react";
import {
  X,
  FileSearch,
  Highlighter,
  Quote,
  Scissors,
  Sparkles,
} from "lucide-react";

export default function ToolsModalQuickActions({ open, onClose }) {
  if (!open) return null;

  const dispatch = (action) => {
    window.dispatchEvent(
      new CustomEvent("litisbot:quick", { detail: { action } })
    );
    if (onClose) onClose();
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
          border border-[#EEE] animate-fadeIn
        "
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-[#3A2A1A]">
            Acciones rápidas
          </h2>

          <button
            className="p-2 rounded-full hover:bg-gray-100"
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </div>

        {/* GRID */}
        <div className="grid grid-cols-2 gap-3">

          {/* RESUMEN */}
          <ActionBtn
            label="Resumen express"
            icon={<FileSearch size={22} />}
            onClick={() => dispatch("resumen_express")}
          />

          {/* TRANSFORMAR */}
          <ActionBtn
            label="Reescribir claro"
            icon={<Highlighter size={22} />}
            onClick={() => dispatch("reescribir_claro")}
          />

          {/* EXTRAER HECHOS */}
          <ActionBtn
            label="Hechos clave"
            icon={<Scissors size={22} />}
            onClick={() => dispatch("extraer_hechos")}
          />

          {/* TONO FORMAL */}
          <ActionBtn
            label="Tono jurídico"
            icon={<Quote size={22} />}
            onClick={() => dispatch("tono_juridico")}
          />

          {/* PULIR TEXTO */}
          <ActionBtn
            label="Pulir redacción"
            icon={<Sparkles size={22} />}
            onClick={() => dispatch("pulir_texto")}
          />
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// BOTÓN (minimal pro)
// ============================================================================
function ActionBtn({ label, icon, onClick }) {
  return (
    <button
      onClick={onClick}
      className="
        flex flex-col items-center justify-center gap-2 
        p-4 rounded-xl 
        border border-[#EFEFEF]
        hover:bg-[#FAFAFA] 
        transition
      "
    >
      <div className="text-[#5C2E0B] opacity-70">{icon}</div>
      <span className="text-sm text-[#3A2A1A]">{label}</span>
    </button>
  );
}
