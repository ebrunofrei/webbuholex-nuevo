// ============================================================================
// 🎨 DisplaySettingsPanel — Preferencias de visualización (REAL)
// ----------------------------------------------------------------------------
// - UI real
// - Persistencia localStorage
// - Efecto inmediato en UI
// - Sin backend
// - Sin contextos globales
// ============================================================================

import React, { useEffect, useState } from "react";

/* ============================================================================
   KEYS DE PERSISTENCIA
============================================================================ */
const STORAGE_KEYS = {
  TEXT_SCALE: "ui.textScale",
  COMPACT: "ui.compact",
  ANIMATIONS: "ui.animations",
};

export default function DisplaySettingsPanel({ onBack }) {
  const [textScale, setTextScale] = useState(false);
  const [compact, setCompact] = useState(false);
  const [animations, setAnimations] = useState(true);

  /* ==========================================================================
     LOAD DESDE localStorage
  ========================================================================== */
  useEffect(() => {
    setTextScale(localStorage.getItem(STORAGE_KEYS.TEXT_SCALE) === "true");
    setCompact(localStorage.getItem(STORAGE_KEYS.COMPACT) === "true");
    const anim = localStorage.getItem(STORAGE_KEYS.ANIMATIONS);
    setAnimations(anim !== "false"); // default true
  }, []);

  /* ==========================================================================
     APPLY EFFECTS (UI GLOBAL)
  ========================================================================== */
  useEffect(() => {
    document.documentElement.classList.toggle(
      "ui-text-large",
      textScale
    );
    localStorage.setItem(STORAGE_KEYS.TEXT_SCALE, textScale);
  }, [textScale]);

  useEffect(() => {
    document.documentElement.classList.toggle(
      "ui-compact",
      compact
    );
    localStorage.setItem(STORAGE_KEYS.COMPACT, compact);
  }, [compact]);

  useEffect(() => {
    document.documentElement.classList.toggle(
      "ui-no-animations",
      !animations
    );
    localStorage.setItem(STORAGE_KEYS.ANIMATIONS, animations);
  }, [animations]);

  return (
    <div className="space-y-4">
      {/* DESCRIPCIÓN */}
      <div className="text-[13px] text-black/70 leading-snug">
        Preferencias que afectan la experiencia visual del análisis.
      </div>

      {/* SETTINGS */}
      <div className="space-y-4">
        <SettingItem
          label="Texto más grande"
          description="Aumenta el tamaño de letra del chat."
          value={textScale}
          onChange={setTextScale}
        />

        <SettingItem
          label="Interfaz compacta"
          description="Reduce espacios verticales."
          value={compact}
          onChange={setCompact}
        />

        <SettingItem
          label="Animaciones"
          description="Habilita transiciones visuales."
          value={animations}
          onChange={setAnimations}
        />
      </div>

      {/* VOLVER */}
      <button
        onClick={onBack}
        className="
          mt-2
          px-3 py-2
          text-[13px]
          opacity-70
          hover:opacity-100
          hover:bg-black/5
          rounded-md
          transition
        "
      >
        Volver
      </button>
    </div>
  );
}

/* ============================================================================
// SETTING ITEM
============================================================================ */
function SettingItem({ label, description, value, onChange }) {
  return (
    <div
  className="
    flex items-start justify-between gap-3
    transition-transform transition-colors
    active:translate-y-[1px]
  ">
      <div className="pr-2">
        <div className="font-medium">{label}</div>
        <div className="text-[12px] text-black/70">
          {description}
        </div>
      </div>

      <Toggle value={value} onToggle={() => onChange(!value)} />
    </div>
  );
}

/* ============================================================================
// TOGGLE REAL
============================================================================ */
function Toggle({ value, onToggle }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={value}
      aria-label={value ? "Desactivar opción" : "Activar opción"}
      tabIndex={0}
      onClick={onToggle}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onToggle();
        }
      }}
      className={`
        relative inline-flex h-5 w-9 items-center
        rounded-full 
        transition transition-transform
        active:scale-[0.96]
        focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2
        ${value ? "bg-black" : "bg-black/30"}
      `}
    >
      <span
        className={`
          inline-block h-4 w-4 rounded-full bg-white shadow
          transform transition-transform duration-150 ease-out
          ${value ? "translate-x-4" : "translate-x-0.5"}
        `}
      />
    </button>
  );
}

