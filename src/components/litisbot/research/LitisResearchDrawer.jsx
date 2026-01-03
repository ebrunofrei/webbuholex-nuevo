// src/components/litisbot/research/LitisResearchDrawer.jsx
import React, { useState, useEffect, useCallback } from "react";
import {
  FaBook,
  FaFileAlt,
  FaStickyNote,
  FaLayerGroup,
  FaTimes,
} from "react-icons/fa";

// PLACEHOLDERS: pronto los reemplazamos con componentes reales
import LRE_JurisSearch from "./LRE_JurisSearch.jsx";
import LRE_UserDocs from "./LRE_UserDocs.jsx";
import LRE_Notes from "./LRE_Notes.jsx";
import LRE_ContextStack from "./LRE_ContextStack.jsx";

const TABS = [
  { id: "juris", label: "Jurisprudencia", icon: <FaBook /> },
  { id: "docs", label: "Documentos", icon: <FaFileAlt /> },
  { id: "notes", label: "Notas", icon: <FaStickyNote /> },
  { id: "context", label: "Contexto activo", icon: <FaLayerGroup /> },
];

export default function LitisResearchDrawer({
  open,
  onClose,
  onAddContext,
  onRemoveContext,
  contextStack = [],
  user,
}) {
  const [tab, setTab] = useState("juris");

  // Animación de bloqueo scroll al abrir
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => (document.body.style.overflow = "");
  }, [open]);

  const handleClose = useCallback(() => {
    if (typeof onClose === "function") onClose();
  }, [onClose]);

  // Drawer cerrado → no renderizamos nada
  if (!open) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-[998] bg-black/30 animate-fadeIn"
        onClick={handleClose}
      />

      {/* Drawer */}
      <aside
        className="
          fixed top-0 left-0 z-[999]
          w-[380px] max-w-[90%] h-full
          bg-white shadow-2xl border-r
          transform translate-x-0
          animate-slideInLeft
          flex flex-col
        "
        style={{ borderColor: "rgba(92,46,11,0.25)" }}
      >
        {/* HEADER */}
        <header
          className="flex items-center justify-between px-4 py-3 border-b"
          style={{
            background: "#5C2E0B",
            borderColor: "rgba(255,255,255,0.15)",
            color: "white",
          }}
        >
          <div>
            <p className="text-base font-semibold">Panel Research</p>
            <p className="text-[12px] opacity-80">
              Selecciona insumos para el análisis
            </p>
          </div>

          <button
            onClick={handleClose}
            className="text-white text-xl font-bold hover:opacity-75"
          >
            <FaTimes />
          </button>
        </header>

        {/* TABS */}
        <nav className="px-3 py-2 border-b flex gap-2 overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-3 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 whitespace-nowrap
                transition
                ${
                  tab === t.id
                    ? "text-white"
                    : "text-[#5C2E0B] bg-transparent hover:bg-[rgba(92,46,11,0.08)]"
                }
              `}
              style={{
                background:
                  tab === t.id ? "#5C2E0B" : "rgba(255,255,255,1)",
              }}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </nav>

        {/* CONTENIDO SCROLL */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 text-[#5C2E0B]">
          {tab === "juris" && (
            <LRE_JurisSearch onAddContext={onAddContext} />
          )}

          {tab === "docs" && (
            <LRE_UserDocs onAddContext={onAddContext} />
          )}

          {tab === "notes" && (
            <LRE_Notes user={user} onAddContext={onAddContext} />
          )}

          {tab === "context" && (
            <LRE_ContextStack
              contextStack={contextStack}
              onRemoveContext={onRemoveContext}
            />
          )}
        </div>
      </aside>
    </>
  );
}

/* ============================
   TAILWIND ANIMATIONS
=============================== */
/*
Agrega en tu CSS global (index.css o tailwind.css):

@keyframes slideInLeft {
  from { transform: translateX(-105%); }
  to { transform: translateX(0); }
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.animate-slideInLeft {
  animation: slideInLeft 0.28s ease-out forwards;
}

.animate-fadeIn {
  animation: fadeIn 0.25s ease-out forwards;
}
*/
