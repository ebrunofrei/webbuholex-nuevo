import React, { useEffect, useRef } from "react";
import { Pencil, Trash2 } from "lucide-react";

export default function ChatSessionMenu({
  open,
  onClose,
  onRename,
  onDelete,
}) {
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;

    const h = (e) =>
      ref.current && !ref.current.contains(e.target) && onClose();
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      ref={ref}
      className="
        absolute right-2 top-9 z-20
        w-40 rounded-xl bg-white
        border border-[#5C2E0B]/20
        shadow-md
      "
    >
      <MenuItem label="Renombrar" onClick={onRename} />
      <MenuItem
        label="Eliminar"
        danger
        onClick={onDelete}
      />
    </div>
  );
}

function MenuItem({ label, onClick, danger }) {
  return (
    <button
      onClick={onClick}
      className={`
        w-full px-3 py-2 text-sm text-left
        ${danger
          ? "text-red-600 hover:bg-red-50"
          : "text-[#5C2E0B] hover:bg-[#F6EFEA]"
        }
      `}
    >
      {label}
    </button>
  );
}
