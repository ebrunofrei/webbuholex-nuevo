// ============================================================================
// 🧠 CognitiveSignal — Señal cognitiva jurídica (UX-3.2 CANÓNICO)
// ----------------------------------------------------------------------------
// - No decide
// - No dramatiza
// - Advierte con sobriedad profesional
// ============================================================================

import React from "react";
import { AlertTriangle, Info } from "lucide-react";

export default function CognitiveSignal({ signal }) {
  if (!signal) return null;

  const { nivel = "info", etiqueta, detalle } = signal;

  const config = {
    info: {
      icon: <Info size={16} />,
      border: "border-[#5C2E0B]/40",
      bg: "bg-[#FAF7F4]",
      text: "text-[#5C2E0B]",
    },
    atencion: {
      icon: <AlertTriangle size={16} />,
      border: "border-[#C07A1F]",
      bg: "bg-[#FFF7EC]",
      text: "text-[#7A4A10]",
    },
    riesgo: {
      icon: <AlertTriangle size={16} />,
      border: "border-[#8B2C2C]",
      bg: "bg-[#FFF1F1]",
      text: "text-[#8B2C2C]",
    },
  };

  const ui = config[nivel] || config.info;

  return (
    <div
      className={`
        mt-4
        px-4 py-3
        rounded-xl
        border-l-4 ${ui.border}
        ${ui.bg}
        ${ui.text}
        text-sm
        leading-relaxed
      `}
    >
      <div className="flex items-center gap-2 font-semibold mb-1">
        {ui.icon}
        <span>{etiqueta || "Nota jurídica"}</span>
      </div>

      {detalle && (
        <div className="text-[14px] opacity-90">
          {detalle}
        </div>
      )}
    </div>
  );
}
