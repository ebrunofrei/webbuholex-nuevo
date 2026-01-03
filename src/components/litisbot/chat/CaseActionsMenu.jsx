import React, { useEffect, useRef } from "react";
import { Pencil, Archive, Trash2 } from "lucide-react";

/**
 * Mini menú contextual por caso
 * - UI pura
 * - No estado global
 * - No lógica de negocio
 */
export default function CaseActionsMenu({
  open,
  onClose,
  onRename,
  onArchive,
  onDelete,
}) {
  const ref = useRef(null);

  // Cerrar al hacer click fuera
  useEffect(() => {
    if (!open) return;

    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) {
        onClose?.();
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () =>
      document.removeEventListener("mousedown", handleClickOutside);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      ref={ref}
      className="
        absolute right-2 top-10 z-20
        w-44 rounded-xl border
        bg-white
        border-[#5C2E0B]/20
        shadow-lg
      "
    >
      <MenuItem icon={Pencil} label="Renombrar" onClick={onRename} />
      <MenuItem icon={Archive} label="Archivar" onClick={onArchive} />
      <MenuItem
        icon={Trash2}
        label="Eliminar"
        danger
        onClick={onDelete}
      />
    </div>
  );
}

function MenuItem({ icon: Icon, label, onClick, danger = false }) {
  return (
    <button
      onClick={onClick}
      className={`
        w-full flex items-center gap-2
        px-3 py-2 text-sm
        text-left transition
        ${
          danger
            ? "text-red-600 hover:bg-red-50"
            : "text-[#5C2E0B] hover:bg-[#F6EFEA]"
        }
      `}
    >
      <Icon size={16} />
      {label}
    </button>
  );
}
