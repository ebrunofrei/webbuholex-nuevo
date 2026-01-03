// ============================================================================
// 🦉 JurisBanner (Enterprise Edition – MultiJuris 0/5)
// ----------------------------------------------------------------------------
// Muestra las jurisprudencias seleccionadas (máx. 5).
// Cada jurisprudencia aparece como un chip removible.
// Interfaz limpia, legal, profesional.
// ============================================================================

import React from "react";
import { X } from "lucide-react";

export default function JurisBanner({
  jurisSeleccionada = [],
  onRemoveJuris,
  max = 5,
}) {
  if (!Array.isArray(jurisSeleccionada) || jurisSeleccionada.length === 0)
    return null;

  return (
    <div className="w-full bg-[#FFF7F2] border border-[#5C2E0B]/20 rounded-xl px-4 py-3 shadow-sm">

      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-[14px] font-semibold text-[#5C2E0B]">
          Jurisprudencias seleccionadas
        </h3>

        <span className="text-xs text-[#5C2E0B]/70">
          {jurisSeleccionada.length} / {max}
        </span>
      </div>

      {/* Chips */}
      <div className="flex flex-wrap gap-2">
        {jurisSeleccionada.map((j, idx) => {
          const label =
            j.titulo ||
            j.nombre ||
            j.resolucion ||
            j.codigo ||
            j._id ||
            `Juris #${idx + 1}`;

          return (
            <div
              key={j._id || idx}
              className="flex items-center gap-2 bg-[#5C2E0B]/10 text-[#5C2E0B] px-3 py-1.5 rounded-full text-[12px] max-w-[260px] overflow-hidden"
              title={label}
            >
              {/* Texto truncado */}
              <span className="truncate">{label}</span>

              {/* Remover */}
              <button
                className="ml-1 p-0.5 rounded-full hover:bg-[#8C4A1F]/20 transition"
                onClick={() => onRemoveJuris(j._id || j.id)}
                title="Quitar jurisprudencia"
              >
                <X size={14} className="text-[#8C4A1F]" />
              </button>
            </div>
          );
        })}
      </div>

    </div>
  );
}
