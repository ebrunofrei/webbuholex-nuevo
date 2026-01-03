/* ============================================================
   ⏳ TypingIndicator (LitisBot PRO)
   ------------------------------------------------------------
   - Indicador de escritura animado estilo GPT
   - Usa colores institucionales de BúhoLex
   - Reutilizable en Engine, BubbleChat y páginas móviles
============================================================ */

import React from "react";

export default function TypingIndicator({ small = false }) {
  return (
    <div className="flex justify-start w-full animate-fadeInSlow">
      <div
        className={`
          inline-flex items-center gap-3 px-3 py-2 rounded-2xl
          bg-white shadow-[0_2px_8px_rgba(0,0,0,0.06)]
          border border-[#E2D7C5]
          ${small ? "max-w-[220px]" : "max-w-[260px]"}
        `}
      >
        {/* ICONO */}
        <div
          className="
            w-7 h-7 rounded-full bg-[#5C2E0B]
            flex items-center justify-center text-[13px] text-white font-bold
          "
        >
          🦉
        </div>

        {/* TEXTO + BOLITAS */}
        <div className="flex flex-col">
          <span className="text-[11px] font-semibold text-[#5C2E0B]">
            LitisBot está pensando…
          </span>

          <div className="flex items-center gap-1 mt-[2px]">
            <span className="litis-typing-dot" />
            <span className="litis-typing-dot litis-typing-dot-delay-1" />
            <span className="litis-typing-dot litis-typing-dot-delay-2" />
          </div>
        </div>
      </div>
    </div>
  );
}
