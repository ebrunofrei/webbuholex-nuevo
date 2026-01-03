// ============================================================================
// 🧠 SelectableTextLayer — Selección con intención jurídica (UX-B.2)
// ----------------------------------------------------------------------------
// Rol:
// - Detecta texto seleccionado dentro del mensaje
// - Muestra menú contextual discreto (íconos)
// - EMITE intención (NO ejecuta acciones)
// ============================================================================

import React, { useEffect, useRef, useState } from "react";
import {
  Search,
  AlertTriangle,
  FileText,
  Edit3,
} from "lucide-react";

export default function SelectableTextLayer({ children }) {
  const containerRef = useRef(null);
  const [selectionText, setSelectionText] = useState("");
  const [menuPos, setMenuPos] = useState(null);

  // ============================================================
  // Detectar selección
  // ============================================================
  useEffect(() => {
    const handleMouseUp = () => {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed) {
        clearSelection();
        return;
      }

      const text = sel.toString().trim();
      if (!text) {
        clearSelection();
        return;
      }

      // Verificar que la selección esté dentro del mensaje
      if (
        containerRef.current &&
        !containerRef.current.contains(sel.anchorNode)
      ) {
        clearSelection();
        return;
      }

      const range = sel.getRangeAt(0);
      const rect = range.getBoundingClientRect();

      setSelectionText(text);
      setMenuPos({
        top: rect.top + window.scrollY - 42,
        left: rect.left + rect.width / 2,
      });
    };

    const handleMouseDown = () => {
      clearSelection();
    };

    document.addEventListener("mouseup", handleMouseUp);
    document.addEventListener("mousedown", handleMouseDown);

    return () => {
      document.removeEventListener("mouseup", handleMouseUp);
      document.removeEventListener("mousedown", handleMouseDown);
    };
  }, []);

  function clearSelection() {
    setSelectionText("");
    setMenuPos(null);
  }

  // ============================================================
  // Emitir intención jurídica
  // ============================================================
  function emitIntent(intent) {
    if (!selectionText) return;

    window.dispatchEvent(
      new CustomEvent("litisbot:intent", {
        detail: {
          type: "TEXT_INTENT",
          intent,
          payload: {
            text: selectionText,
          },
        },
      })
    );

    clearSelection();
    window.getSelection()?.removeAllRanges();
  }

  return (
    <div ref={containerRef} className="relative">
      {children}

      {menuPos && (
        <div
          style={{
            position: "absolute",
            top: menuPos.top,
            left: menuPos.left,
            transform: "translateX(-50%)",
          }}
          className="
            z-50
            flex gap-1
            px-2 py-1
            bg-white
            border border-black/10
            rounded-xl
            shadow-lg
            animate-fadeInSlow
          "
        >
          <IconButton
            icon={Search}
            label="Analizar"
            onClick={() => emitIntent("ANALIZAR_FRAGMENTO")}
          />
          <IconButton
            icon={AlertTriangle}
            label="Falacias"
            onClick={() => emitIntent("DETECTAR_FALACIAS")}
          />
          <IconButton
            icon={FileText}
            label="Fundamento"
            onClick={() => emitIntent("EXTRAER_FUNDAMENTO")}
          />
          <IconButton
            icon={Edit3}
            label="Reescribir"
            onClick={() => emitIntent("REESCRIBIR_FORMAL")}
          />
        </div>
      )}
    </div>
  );
}

/* ========================================================================
   BOTÓN DISCRETO
======================================================================== */
function IconButton({ icon: Icon, label, onClick }) {
  return (
    <button
      onClick={onClick}
      title={label}
      className="
        p-2
        rounded-lg
        text-black/70
        hover:text-black
        hover:bg-black/5
        transition
      "
    >
      <Icon size={16} />
    </button>
  );
}
