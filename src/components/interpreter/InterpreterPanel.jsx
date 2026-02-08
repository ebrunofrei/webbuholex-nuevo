// ============================================================================
// 🗣️ InterpreterPanel — Panel de interpretación (NO chat)
// ----------------------------------------------------------------------------
// - Ventana independiente
// - Texto original + traducido
// - Voz ↔ Texto ↔ Voz
// - No interfiere con análisis
// ============================================================================

import React from "react";
import { X } from "lucide-react";

export default function InterpreterPanel({
  open,
  originalText,
  translatedText,
  sourceLang,
  targetLang,
  onClose,
}) {
  if (!open) return null;

  return (
    <div className="
      fixed bottom-24 right-4 z-[9998]
      w-[90vw] max-w-md
      bg-white border rounded-xl shadow-xl
      p-4
    ">
      <div className="flex justify-between items-center mb-2">
        <div className="font-semibold text-sm">
          Intérprete jurídico
        </div>
        <button onClick={onClose}>
          <X size={18} />
        </button>
      </div>

      <div className="text-xs opacity-60 mb-1">
        {sourceLang} → {targetLang}
      </div>

      <div className="mb-3">
        <div className="text-xs font-medium mb-1">
          Texto original
        </div>
        <div className="p-2 bg-gray-100 rounded text-sm">
          {originalText || "—"}
        </div>
      </div>

      <div>
        <div className="text-xs font-medium mb-1">
          Traducción
        </div>
        <div className="p-2 bg-[#F7EFE8] rounded text-sm">
          {translatedText || "—"}
        </div>
      </div>
    </div>
  );
}
