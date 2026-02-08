// ============================================================================
// 👤 UserMiniPanel — Mini panel de usuario (CANÓNICO / HARDWARE)
// ----------------------------------------------------------------------------
// - Vive en ChatSidebar (parte baja)
// - UI pura (hardware)
// - NO auth
// - NO backend
// - NO lógica cognitiva
// - Emite callbacks explícitos
// ============================================================================

import React from "react";
import { User, Settings, LogOut, Home, Building2 } from "lucide-react";

export default function UserMiniPanel({
  onGoHome,
  onGoOffice,
  onOpenAccount,
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
      aria-label="Panel de usuario"
    >
      {/* IDENTIDAD (placeholder) */}
      <div className="flex items-center gap-3 px-2 py-2">
        <div
          className="
            w-10 h-10
            rounded-full
            bg-black/10
            flex items-center justify-center
          "
          aria-hidden="true"
        >
          <User size={20} />
        </div>

        <div className="leading-tight">
          <div className="text-[15px] font-semibold">Cuenta de usuario</div>
          <div className="text-[12px] opacity-60">Preferencias y modos</div>
        </div>
      </div>

      {/* ACCIONES */}
      <div className="space-y-1">
        <ActionButton icon={Home} label="Ir al Home" onClick={onGoHome} />
        <ActionButton
          icon={Building2}
          label="Volver a la Oficina Virtual"
          onClick={onGoOffice}
        />
        <ActionButton
          icon={Settings}
          label="Cuenta y configuración"
          onClick={onOpenAccount}
        />
        <ActionButton
          icon={LogOut}
          label="Cerrar sesión"
          danger
          onClick={onLogout}
        />
      </div>
    </div>
  );
}

/* ============================================================================
   BOTÓN — Sidebar (reutilizable)
============================================================================ */
function ActionButton({ icon: Icon, label, onClick, danger = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={[
        "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[15px] transition",
        "focus:outline-none focus:ring-2 focus:ring-black/20",
        danger ? "text-red-600 hover:bg-red-50" : "hover:bg-black/5",
      ].join(" ")}
    >
      <span className="opacity-70">
        <Icon size={18} />
      </span>
      <span>{label}</span>
    </button>
  );
}
