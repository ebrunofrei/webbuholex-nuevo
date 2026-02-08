// ============================================================================
// 👤 AccountMiniModal — Cuenta y configuración (HARDWARE / NAV)
// ----------------------------------------------------------------------------
// - UI pura
// - Navegación interna por vistas
// - Sin backend
// - Sin lógica cognitiva
// - Preparado para panels reales
// ============================================================================

import React, { useEffect, useRef, useState } from "react";
import { X, ArrowLeft } from "lucide-react";

import DisplaySettingsPanel from "@/components/litisbot/account/DisplaySettingsPanel.jsx";
import CognitiveSettingsPanel from "@/components/litisbot/account/CognitiveSettingsPanel.jsx";
import { useLitisCognitiveSafe } from "@/components/litisbot/context/LitisBotCognitiveContext.jsx";

/* ============================================================================
// VISTAS SOPORTADAS (CONTRATO)
============================================================================ */
const VIEWS = {
  MENU: "menu",
  COGNITIVE: "cognitive",
  DISPLAY: "display",
  ACCESSIBILITY: "accessibility",
};

export default function AccountMiniModal({ open = true, onClose }) {
  const ref = useRef(null);
  const [view, setView] = useState(VIEWS.MENU);
  const lastFocusedRef = useRef(null);

  // Guardar foco previo y enfocar modal
  useEffect(() => {
    if (!open) return;

    lastFocusedRef.current = document.activeElement;

    const focusable = ref.current?.querySelector(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    focusable?.focus();

    return () => {
      lastFocusedRef.current?.focus?.();
    };
  }, [open]);

  /* ========================================================================
     CERRAR CON ESC
  ======================================================================== */
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose?.();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  /* ========================================================================
     TRAP TAB
  ======================================================================== */
  useEffect(() => {
    if (!open) return;

    const handleTab = (e) => {
      if (e.key !== "Tab") return;

      const focusables = ref.current?.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );

      if (!focusables || focusables.length === 0) return;

      const first = focusables[0];
      const last = focusables[focusables.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    window.addEventListener("keydown", handleTab);
    return () => window.removeEventListener("keydown", handleTab);
  }, [open]);

  /* ========================================================================
     RESET DE VISTA AL CERRAR
  ======================================================================== */
  useEffect(() => {
    if (!open) setView(VIEWS.MENU);
  }, [open]);

  if (!open) return null;

  return (
    <div
      ref={ref}
      role="dialog"
      aria-modal="true"
      aria-labelledby="account-modal-title"
      aria-describedby="account-modal-desc"
      className="
        absolute bottom-20 left-3 z-[999]
        w-[280px] max-w-[90vw]
        rounded-xl
        bg-white
        border border-black/10
        shadow-2xl
        overflow-hidden
      "
    >
      <Header
        view={view}
        onBack={() => setView(VIEWS.MENU)}
        onClose={onClose}
      />

      <div
        className="
            px-4 pt-3 pb-4
            text-[14px]
            space-y-3
            min-h-[120px]
        "
        >
        <ViewRouter view={view} onNavigate={setView} />
      </div>
    </div>
  );
}

/* ============================================================================
// HEADER — AccountMiniModal (accesible + jerarquía clara)
============================================================================ */
function Header({ view, onBack, onClose }) {
  const isMenu = view === VIEWS.MENU;

  return (
    <div
      className="
        flex items-center gap-2
        px-4 py-3
        border-b
        bg-gradient-to-b from-black/[0.04] to-transparent
      "
    >
      {/* BOTÓN VOLVER / ESPACIADOR */}
      {isMenu ? (
        <div className="w-6" aria-hidden="true" />
      ) : (
        <button
          type="button"
          onClick={onBack}
          aria-label="Volver al menú de cuenta"
          className="
            inline-flex items-center justify-center
            h-6 w-6 rounded
            text-black/70 hover:text-black
            transition-transform transition-colors
            active:translate-y-[1px]
            focus:outline-none focus-visible:ring-2 focus-visible:ring-black/40
          "
        >
          <ArrowLeft size={16} aria-hidden="true" />
        </button>
      )}

      {/* TÍTULO */}
      <h2
        id="account-modal-title"
        className="
          flex-1
          text-[15px]
          font-semibold
          tracking-tight
          truncate
        "
      >
        {titleByView(view)}
      </h2>

      {/* BOTÓN CERRAR */}
      <button
        type="button"
        onClick={onClose}
        aria-label="Cerrar panel de configuración"
        className="
          inline-flex items-center justify-center
          h-6 w-6
          rounded
          text-black/70
          hover:text-black
          focus:outline-none
          focus-visible:ring-2 focus-visible:ring-black/40
        "
      >
        <X size={16} aria-hidden="true" />
      </button>
    </div>
  );
}

/* ============================================================================
// ROUTER DE VISTAS (CLAVE DEL REFACTOR)
============================================================================ */
function ViewRouter({ view, onNavigate }) {
  return (
    <ViewTransition viewKey={view}>
      {view === VIEWS.MENU && <MenuView onSelect={onNavigate} />}

      {view === VIEWS.COGNITIVE && (
        <CognitiveSettingsBridge
          onBack={() => onNavigate(VIEWS.MENU)}
        />
      )}

      {view === VIEWS.DISPLAY && (
        <DisplaySettingsPanel
          onBack={() => onNavigate(VIEWS.MENU)}
        />
      )}

      {view === VIEWS.ACCESSIBILITY && (
        <AccessibilitySettingsPanel
          onBack={() => onNavigate(VIEWS.MENU)}
        />
      )}
    </ViewTransition>
  );
}

/* ============================================================================
// MENÚ PRINCIPAL
============================================================================ */
function MenuView({ onSelect }) {
  return (
    <div className="space-y-1">
      <MenuItem
        label="Preferencias de visualización"
        onClick={() => onSelect(VIEWS.DISPLAY)}
      />
      <MenuItem
        label="Modo cognitivo"
        onClick={() => onSelect(VIEWS.COGNITIVE)}
      />
      <MenuItem
        label="Accesibilidad"
        onClick={() => onSelect(VIEWS.ACCESSIBILITY)}
      />
    </div>
  );
}

/* ============================================================================
// ITEM DE MENÚ
============================================================================ */
function MenuItem({ label, onClick }) {
  return (
    <button
      onClick={onClick}
      className="
        w-full text-left
        px-3 py-2.5
        rounded-md
        text-[14px]
        hover:bg-black/5
        focus:outline-none
        focus:ring-2 focus:ring-black/20
        transition-colors
      "
    >
      {label}
    </button>
  );
}

/* ============================================================================
// 🧠 CognitiveSettingsBridge — UI ↔ CognitiveContext (ADAPTADOR)
// ----------------------------------------------------------------------------
// - Vive en AccountMiniModal
// - NO renderiza layout propio
// - Conecta toggle → contexto cognitivo
// ============================================================================ */
function CognitiveSettingsBridge({ onBack }) {
  const cognitive = useLitisCognitiveSafe();

  if (!cognitive) {
    return (
      <div className="text-[13px] text-black/70">
        Configuración cognitiva no disponible.
      </div>
    );
  }

  const { cognitiveProfile, setAcademicProfile } = cognitive;

  const enabled = cognitiveProfile?.profundidad === "alta";

  return (
    <CognitiveSettingsPanel
      value={enabled}
      onToggle={() => setAcademicProfile(!enabled)}
      onBack={onBack}
    />
  );
}

/* ============================================================================
// ACCESSIBILITY (placeholder por ahora, para que no crashee)
============================================================================ */
function AccessibilitySettingsPanel({ onBack }) {
  return (
    <div className="text-[13px] opacity-70 space-y-2">
      <div>Panel de <strong>Accesibilidad</strong> (pendiente).</div>
      <button
        onClick={onBack}
        className="px-3 py-2 rounded-md hover:bg-black/5 transition"
      >
        Volver
      </button>
    </div>
  );
}

/* ============================================================================
// HELPERS
============================================================================ */
function titleByView(view) {
  switch (view) {
    case VIEWS.COGNITIVE:
      return "Modo cognitivo";
    case VIEWS.DISPLAY:
      return "Visualización";
    case VIEWS.ACCESSIBILITY:
      return "Accesibilidad";
    default:
      return "Cuenta y configuración";
  }
}
/* ============================================================================
   TRANSITION WRAPPER (fade + slide)
============================================================================ */
function ViewTransition({ children, viewKey }) {
  return (
    <div
      key={viewKey}
      className="
        animate-view-enter
        will-change-transform
      "
    >
      {children}
    </div>
  );
}
