// ============================================================================
// 🧭 ActionHints — Pistas de acción sugerida (UX-3.3 CANÓNICO)
// ----------------------------------------------------------------------------
// - No ejecuta
// - No muta
// - Emite acciones puras
// ============================================================================

import React from "react";
import { FileText, Clock, ChevronRight } from "lucide-react";

const ICONS = {
  SAVE_DRAFT: <FileText size={16} />,
  REHYDRATE_DRAFT: <Clock size={16} />,
  default: <ChevronRight size={16} />,
};

export default function ActionHints({ actions = [], onAction }) {
  if (!Array.isArray(actions) || actions.length === 0) return null;

  return (
    <div className="mt-4 space-y-2">
      <div className="text-xs uppercase tracking-wide text-black/50">
        Posibles acciones
      </div>

      <div className="flex flex-col gap-2">
        {actions.map((action) => {
          const icon = ICONS[action.type] || ICONS.default;

          return (
            <button
              key={action.id}
              onClick={() => onAction?.(action)}
              className="
                flex items-start gap-3
                px-4 py-3
                rounded-xl
                border border-[#5C2E0B]/30
                bg-white
                text-left
                hover:bg-[#FAF7F4]
                transition
              "
            >
              <div className="mt-0.5 text-[#5C2E0B]">
                {icon}
              </div>

              <div className="flex-1">
                <div className="text-sm font-semibold text-black">
                  {action.label}
                </div>

                {action.hint && (
                  <div className="text-sm text-black/60 mt-0.5">
                    {action.hint}
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
