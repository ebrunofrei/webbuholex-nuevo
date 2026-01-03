// ============================================================================
// 📁 CaseItem — Ítem de Caso (UX-3 Canónico)
// ----------------------------------------------------------------------------
// - Alta legibilidad (baja visión)
// - Rail visual activo
// - Acciones desacopladas
// - Accesible y consistente
// - ROOT ("Mis estados de análisis") sin menú ni fecha
// ============================================================================

import React, { useState } from "react";
import { MoreVertical } from "lucide-react";
import CaseActionsMenu from "./CaseActionsMenu.jsx";

export default function CaseItem({
  caseData,
  active = false,
  onSelect,
  onRename,
  onArchive,
  onDelete,
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  // 🔑 Identificador canónico del ROOT de análisis
  const isRootAnalysis = caseData.role === "__ROOT_ANALYSIS__";

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => onSelect?.(caseData._id || caseData.id)}
        className={`
          group w-full
          flex items-start gap-3
          px-4 py-3 mb-2
          rounded-xl text-left
          transition-colors
          focus:outline-none focus:ring-2 focus:ring-[#5C2E0B]/40
          ${
            active
              ? "bg-white border border-[#5C2E0B]"
              : "hover:bg-[#F7F1EC]"
          }
        `}
      >
        {/* RAIL IZQUIERDO (SEÑAL COGNITIVA) */}
        <div
          className={`
            w-[4px] rounded-full mt-1
            ${active ? "bg-[#5C2E0B]" : "bg-transparent"}
          `}
          aria-hidden
        />

        {/* CONTENIDO */}
        <div className="flex-1 min-w-0">
          <div
            className={`
              text-[18px] font-semibold truncate
              ${active ? "text-black" : "text-[#3B1E0B]"}
            `}
          >
            {caseData.title || "Caso sin título"}
          </div>

          {/* FECHA — NO se muestra en el ROOT */}
          {!isRootAnalysis && (
            <div className="text-[15px] text-[#6B4A2D] mt-1">
              {caseData.updatedAt
                ? new Date(caseData.updatedAt).toLocaleDateString("es-PE", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })
                : "—"}
            </div>
          )}
        </div>

        {/* ACCIONES — NO se muestran en el ROOT */}
        {!isRootAnalysis && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen((v) => !v);
            }}
            className="
              p-2 rounded-lg
              text-[#5C2E0B]
              hover:bg-[#E9DED4]
              focus:outline-none focus:ring-2 focus:ring-[#5C2E0B]/40
            "
            title="Acciones del caso"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
          >
            <MoreVertical size={20} />
          </button>
        )}
      </button>

      {/* MENÚ CONTEXTUAL — SOLO SI NO ES ROOT */}
      {!isRootAnalysis && (
        <CaseActionsMenu
          open={menuOpen}
          onClose={() => setMenuOpen(false)}
          onRename={() => {
            setMenuOpen(false);
            onRename?.(caseData);
          }}
          onArchive={() => {
            setMenuOpen(false);
            onArchive?.(caseData);
          }}
          onDelete={() => {
            setMenuOpen(false);
            onDelete?.(caseData);
          }}
        />
      )}
    </div>
  );
}
