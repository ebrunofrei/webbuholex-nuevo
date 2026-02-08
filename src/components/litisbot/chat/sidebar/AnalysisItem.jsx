// ============================================================================
// 🧠 AnalysisItem — Hilo de análisis (CANÓNICO / HARDWARE)
// ----------------------------------------------------------------------------
// - UI pura
// - NO storage
// - Emite callbacks con datos válidos
// ============================================================================

import React, { useState } from "react";
import { MoreVertical, Edit3, Archive, Trash2 } from "lucide-react";

export default function AnalysisItem({
  analysis,
  active = false,
  onSelect,
  onRename,
  onArchive,
  onDelete,
}) {
  const [openMenu, setOpenMenu] = useState(false);

  function handleRename() {
    const nuevo = prompt("Renombrar análisis:", analysis.title || "");
    if (!nuevo || !nuevo.trim()) return;
    onRename?.(nuevo.trim());
  }

  function handleArchive() {
    onArchive?.();
  }

  function handleDelete() {
    if (!confirm("¿Eliminar este análisis?")) return;
    onDelete?.();
  }

  return (
    <div
    className={`
        relative group
        flex items-center justify-between
        min-w-0
        px-3 py-2 rounded-md
        cursor-pointer
        text-[15px]
        ${active ? "bg-[#5C2E0B] text-white" : "hover:bg-black/5"}
    `}
    onClick={onSelect}
    >
      {/* TÍTULO */}
      <div
        className="min-w-0 truncate pr-6"
        title={analysis?.title || "Análisis"}
      >
        {analysis?.title || "Análisis"}
      </div>

      {/* BOTÓN ⋮ */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpenMenu((v) => !v);
        }}
        className={`
          absolute right-2 top-1/2 -translate-y-1/2
          p-1 rounded
          opacity-0 group-hover:opacity-100
          transition
          ${active ? "hover:bg-white/20" : "hover:bg-black/10"}
        `}
      >
        <MoreVertical size={16} />
      </button>

      {/* MENÚ */}
      {openMenu && (
        <div
          className="
            absolute right-2 top-full mt-1 z-20
            w-40 bg-white border border-black/10
            rounded-md shadow-lg overflow-hidden
          "
          onClick={(e) => e.stopPropagation()}
        >
          <MenuItem
            icon={<Edit3 size={14} />}
            label="Renombrar"
            onClick={() => {
              setOpenMenu(false);
              handleRename();
            }}
          />

          <MenuItem
            icon={<Archive size={14} />}
            label={analysis.archivedAt ? "Restaurar" : "Archivar"}
            onClick={() => {
              setOpenMenu(false);
              handleArchive();
            }}
          />

          <MenuItem
            icon={<Trash2 size={14} />}
            label="Eliminar"
            danger
            onClick={() => {
              setOpenMenu(false);
              handleDelete();
            }}
          />
        </div>
      )}
    </div>
  );
}

function MenuItem({ icon, label, onClick, danger = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        w-full flex items-center gap-2
        px-3 py-2 text-[14px] text-left
        transition
        ${danger ? "text-red-600 hover:bg-red-50" : "hover:bg-black/5"}
      `}
    >
      <span className="opacity-70">{icon}</span>
      <span>{label}</span>
    </button>
  );
}
