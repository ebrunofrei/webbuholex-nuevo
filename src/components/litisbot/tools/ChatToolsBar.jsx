// ============================================================================
// 🦉 ChatToolsBar (Enterprise Edition – BúhoLex UI)
// ----------------------------------------------------------------------------
// Barra inferior fija:
// - Centro operativo ÚNICO del abogado
// - Responsive: móvil / tablet / desktop
// ============================================================================

import React from "react";
import {
  PlusCircle,
  Search,
  Wrench,
  Settings,
  BookOpenCheck,
  Paperclip,
  Home,
  Building,
} from "lucide-react";

export default function ChatToolsBar({
  onNuevoChat,
  onOpenJuris,
  onOpenTools,
  onOpenConfig,
  onOpenResearch,
  onAttachFiles,
  onGoHome,
  onGoOficina,
}) {
  return (
    <div
      className="
        fixed bottom-0 left-0 right-0 z-40
        bg-white
        border-t border-[#7B3F00]/20
        shadow-[0_-4px_12px_rgba(0,0,0,0.06)]
        px-3 py-2
      "
    >
      <div className="flex items-center justify-between max-w-screen-xl mx-auto">

        {/* ================= IZQUIERDA ================= */}
        <div className="flex items-center gap-3 text-[#5C2E0B]">

          <ToolButton label="Nuevo" onClick={onNuevoChat}>
            <PlusCircle size={20} />
          </ToolButton>

          <ToolButton label="Juris" onClick={onOpenJuris}>
            <Search size={20} />
          </ToolButton>

          <ToolButton label="Adjuntar" onClick={() => {
            document.getElementById("attach-global")?.click();
          }}>
            <Paperclip size={20} />
          </ToolButton>
        </div>

        {/* ================= CENTRO (solo desktop) ================= */}
        <div className="hidden lg:flex items-center gap-4 text-[#5C2E0B]">
          <ToolButton label="Research" onClick={onOpenResearch}>
            <BookOpenCheck size={20} />
          </ToolButton>

          <ToolButton label="Herramientas" onClick={onOpenTools}>
            <Wrench size={20} />
          </ToolButton>

          <ToolButton label="IA" onClick={onOpenConfig}>
            <Settings size={20} />
          </ToolButton>
        </div>

        {/* ================= DERECHA ================= */}
        <div className="flex items-center gap-3 text-[#5C2E0B]">

          <ToolButton label="Inicio" onClick={onGoHome}>
            <Home size={20} />
          </ToolButton>

          <ToolButton label="Oficina" onClick={onGoOficina}>
            <Building size={20} />
          </ToolButton>
        </div>
      </div>

      {/* Input global oculto */}
      <input
        id="attach-global"
        type="file"
        className="hidden"
        multiple
        onChange={onAttachFiles}
      />
    </div>
  );
}

/* ============================================================================
   Botón reutilizable
============================================================================ */

function ToolButton({ children, label, onClick }) {
  return (
    <button
      onClick={onClick}
      className="
        flex flex-col md:flex-row items-center gap-1
        text-xs md:text-sm font-medium
        hover:text-[#8C4A1F]
        transition-colors
        focus:outline-none focus:ring-2 focus:ring-[#A55F2A]/40 rounded
        px-2 py-1
      "
      aria-label={label}
      title={label}
    >
      {children}
      <span className="hidden md:inline">{label}</span>
    </button>
  );
}
