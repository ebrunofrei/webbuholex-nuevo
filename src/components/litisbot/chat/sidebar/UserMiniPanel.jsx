// ============================================================================
// 👤 UserMiniPanel — Mini panel de usuario (CANÓNICO / HARDWARE)
// ----------------------------------------------------------------------------
// - Vive en ChatSidebar (parte baja)
// - UI pura (hardware)
// - NO auth
// - NO backend
// - NO lógica cognitiva
// - Dispara callbacks
// ============================================================================

import React from "react";
import {
  User,
  Settings,
  LogOut,
  Home,
  Building2,
  Sliders,
} from "lucide-react";

export default function UserMiniPanel({
  onClose,

  onGoHome,
  onGoOffice,
  onOpenControlCenter,
  onLogout,
}) {
  return (
    <div
      className="
        w-full
        border-t border-black/10
        bg-[#FAF6F2]
        px-4 py-3
        space-y-2
      "
    >
      {/* ======================================================
          IDENTIDAD (PLACEHOLDER)
      ====================================================== */}
      <div className="flex items-center gap-3 px-2 py-2">
        <div
          className="
            w-10 h-10
            rounded-full
            bg-black/10
            flex items-center justify-center
          "
        >
          <User size={20} />
        </div>

        <div className="leading-tight">
          <div className="text-[15px] font-semibold">
            Cuenta de usuario
          </div>
          <div className="text-[12px] opacity-60">
            Preferencias y modos
          </div>
        </div>
      </div>

      {/* ======================================================
          ACCIONES
      ====================================================== */}
      <div className="space-y-1">

        <ActionButton
          icon={<Home size={18} />}
          label="Ir al Home"
          onClick={onGoHome}
        />

        <ActionButton
          icon={<Building2 size={18} />}
          label="Volver a la Oficina Virtual"
          onClick={onGoOffice}
        />

        <ActionButton
          icon={<Sliders size={18} />}
          label="Centro de control"
          onClick={onOpenControlCenter}
        />

        <ActionButton
          icon={<Settings size={18} />}
          label="Cuenta y configuración"
          onClick={() => {}}
        />

        <ActionButton
          icon={<LogOut size={18} />}
          label="Cerrar sesión"
          danger
          onClick={onLogout}
        />
      </div>
    </div>
  );
}

/* ============================================================================
   BOTÓN DE ACCIÓN — Sidebar
============================================================================ */
function ActionButton({ icon, label, onClick, danger = false }) {
  return (
    <button
      onClick={onClick}
      className={`
        w-full
        flex items-center gap-3
        px-3 py-2 rounded-lg
        text-[15px]
        transition
        ${
          danger
            ? "text-red-600 hover:bg-red-50"
            : "hover:bg-black/5"
        }
      `}
    >
      <span className="opacity-70">{icon}</span>
      <span>{label}</span>
    </button>
  );
}
