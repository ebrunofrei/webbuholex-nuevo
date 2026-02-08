// ============================================================================
// 🧠 CognitiveSettingsPanel — Configuración cognitiva (UI ONLY)
// ----------------------------------------------------------------------------
// - UI pura
// - Sin backend
// - Sin contexto global
// - Toggle determinista (placeholder)
// - Enfoque académico / jurídico
// ============================================================================

import React from "react";

export default function CognitiveSettingsPanel({
  enabled = true,
  onToggle,
  onBack,
}) {
  return (
    <div className="space-y-4 text-[14px]">

      {/* ======================================================
          HEADER
      ====================================================== */}
      <div className="flex items-center gap-2">
        <button
          onClick={onBack}
          aria-label="Volver"
          className="
            text-[13px]
            text-black/70
            hover:opacity-100
            transition
          "
        >
          ←
        </button>

        <div className="font-semibold">
          Modo cognitivo
        </div>
      </div>

      {/* ======================================================
          DESCRIPCIÓN
      ====================================================== */}
      <p className="text-[13px] opacity-70 leading-snug">
        Configura el <strong>nivel de razonamiento jurídico</strong> que emplea
        LitisBot en el análisis.  
        Esta opción <u>no modifica</u> el tono humano ni la personalidad.
      </p>

      {/* ======================================================
          TOGGLE
      ====================================================== */}
      <div className="flex items-center justify-between gap-4">
        <div className="leading-tight">
          <div className="font-medium">
            Perfil académico profundo
          </div>
          <div className="text-[12px] text-black/70">
            Enfoque doctrinal, crítico y metodológico
          </div>
        </div>

        <Toggle
          checked={enabled}
          onChange={onToggle}
        />
      </div>

      {/* ======================================================
          NOTA ACLARATORIA
      ====================================================== */}
      <div className="text-[12px] text-black/70 leading-snug">
        Al activarse, LitisBot razona como <strong>jurista académico e investigador</strong>.
        La expresión humana y claridad comunicativa se mantienen siempre.
      </div>
    </div>
  );
}

/* ============================================================================
   TOGGLE — Accesible y reutilizable
============================================================================ */
function Toggle({ checked, onChange }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      className={`
        relative
        w-11 h-6
        rounded-full
        transition
        focus:outline-none focus:ring-2 focus:ring-red-500/40
        ${checked ? "bg-red-600" : "bg-black/20"}
      `}
    >
      <span
        className={`
          absolute top-[2px]
          w-5 h-5
          bg-white
          rounded-full
          shadow
          transform transition
          ${checked ? "translate-x-5" : "translate-x-1"}
        `}
      />
    </button>
  );
}
