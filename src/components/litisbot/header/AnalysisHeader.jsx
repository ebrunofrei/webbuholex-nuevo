// ============================================================================
// 🧠 AnalysisHeader — Cabecera de análisis (CANÓNICO)
// ----------------------------------------------------------------------------
// - Header cognitivo (NO crea análisis)
// - Identidad LitisBot fija
// - Acceso al Centro de Control
// - Acceso a menú de Modelos / Modos LitisBot
//
// ❌ NO creación de análisis
// ❌ NO botones duplicados
// ❌ NO lógica de sesión
// ============================================================================

import React from "react";
import { Menu, SlidersHorizontal } from "lucide-react";

export default function AnalysisHeader({
  onOpenSidebar,        // sidebar mobile
  onOpenControlCenter,  // drawer derecho
  onOpenBotMenu,        // modelos / modos LitisBot
}) {
  return (
    <header
      className="
        h-16
        w-full
        flex items-center justify-between
        px-4 md:px-5
        bg-white dark:bg-black
        text-black dark:text-white
        border-b border-black/10 dark:border-white/10
        select-none
      "
    >
      {/* =====================================================
          IZQUIERDA — Identidad + Sidebar móvil
      ====================================================== */}
      <div className="flex items-center gap-3">
        {/* Sidebar móvil */}
        <button
          onClick={onOpenSidebar}
          className="md:hidden"
          aria-label="Abrir sidebar"
        >
          <Menu size={22} />
        </button>

        {/* Identidad LitisBot / Modelos */}
        <button
          onClick={onOpenBotMenu}
          className="
            flex items-center gap-2
            hover:opacity-90
            focus:outline-none
          "
          aria-label="Funciones y modelos de LitisBot"
        >
          <img
            src="/icons/icon-192.png"
            alt="LitisBot"
            className="w-12 h-12"
          />

          <div className="leading-snug text-left">
            <div className="text-[15px] font-semibold">
              LitisBot
            </div>
            <div className="text-[11px] opacity-60 tracking-wide">
              Razonamiento jurídico avanzado
            </div>
          </div>
        </button>
      </div>

      {/* =====================================================
          DERECHA — Acciones globales
      ====================================================== */}
      <div className="flex items-center gap-2">
        {/* Centro de control */}
        <button
          onClick={onOpenControlCenter}
          className="
            p-2
            rounded-lg
            hover:bg-black/5 dark:hover:bg-white/5
          "
          aria-label="Centro de control"
        >
          <SlidersHorizontal size={20} />
        </button>
      </div>
    </header>
  );
}
