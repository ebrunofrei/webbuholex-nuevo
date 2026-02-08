import React from "react";
import { Menu, SlidersHorizontal } from "lucide-react";

/**
 * AnalysisHeader — CANÓNICO (PURO)
 * ------------------------------------------------------------
 * - Header estructural
 * - Sin lógica de negocio
 * - Sin conocimiento de herramientas
 * - Sin uso de window / viewport
 * - Reutilizable y estable
 * ------------------------------------------------------------
 */
export default function AnalysisHeader({
  onOpenSidebar,
  onOpenControlCenter,
}) {
  return (
    <header
      className="
        h-16 w-full flex items-center justify-between
        px-4 md:px-5 bg-white
        border-b border-black/10 select-none
      "
    >
      {/* =====================================================
          IZQUIERDA — BRANDING + SIDEBAR
      ===================================================== */}
      <div className="flex items-center gap-3">
        {/* Sidebar (visible solo en mobile por CSS) */}
        <button
          onClick={onOpenSidebar}
          className="md:hidden"
          aria-label="Abrir menú"
        >
          <Menu size={22} />
        </button>

        {/* Branding */}
        <div className="flex items-center gap-2">
          <img
            src="/icons/icon-192.png"
            className="w-10 h-10"
            alt="LitisBot"
          />
          <div>
            <div className="font-semibold">LitisBot</div>
            <div className="text-xs opacity-60">
              Razonamiento jurídico avanzado
            </div>
          </div>
        </div>
      </div>

      {/* =====================================================
          DERECHA — CONTROL CENTER
      ===================================================== */}
      <button
        onClick={onOpenControlCenter}
        className="p-2 rounded-lg hover:bg-black/5"
        title="Centro de control"
      >
        <SlidersHorizontal size={20} />
      </button>
    </header>
  );
}
