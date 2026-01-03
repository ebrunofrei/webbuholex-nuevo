// ============================================================
// 🦉 UserActionsDrawer (Enterprise Edition)
// ------------------------------------------------------------
// - Panel lateral para acciones globales del usuario.
// - Compatible con mobile & desktop.
// - No rompe el contexto del chat.
// ============================================================

import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { LogOut, Settings, Shield, Home, Briefcase, Plus } from "lucide-react";

export default function UserActionsDrawer({
  open = false,
  onClose,
  onNuevoChat,
  userLabel = "Usuario",
  pro = false,
}) {
  const navigate = useNavigate();

  const handleClose = () => {
    onClose?.();
  };

  return (
    <>
      {/* Overlay (solo mobile) */}
      {open && (
        <div
          className="fixed inset-0 bg-black/40 z-[999] md:hidden"
          onClick={(e) => {
            if (e.target === e.currentTarget) handleClose();
          }}
        />
      )}

      {/* Drawer */}
      <aside
        className={`
          fixed top-0 right-0 h-full w-[85%] max-w-[360px]
          bg-white shadow-2xl border-l border-[#E6E6E6]
          z-[1000] transform transition-transform duration-300
          ${open ? "translate-x-0" : "translate-x-full"}
        `}
      >
        {/* HEADER */}
        <div className="p-6 border-b flex items-center gap-4 bg-white">
          <div
            className="
              w-14 h-14 rounded-full 
              bg-[#5C2E0B] text-white 
              flex items-center justify-center text-xl font-semibold
            "
          >
            {userLabel.charAt(0).toUpperCase()}
          </div>

          <div className="flex-1">
            <div className="font-semibold text-[#5C2E0B] text-lg">{userLabel}</div>
            <div className="text-sm text-[#7A7A7A]">
              {pro ? "Cuenta PRO" : "Cuenta Básica"}
            </div>
          </div>
        </div>

        {/* OPTIONS */}
        <div className="p-4 flex flex-col gap-2">

          {/* NUEVO CHAT */}
          <button
            onClick={() => {
              onNuevoChat?.();
              handleClose();
            }}
            className="
              flex items-center gap-3 px-4 py-3 rounded-xl
              bg-[#5C2E0B] text-white font-medium
              hover:bg-[#4A2308] transition
            "
          >
            <Plus size={18} />
            Nuevo chat
          </button>

          {/* IR A OFICINA VIRTUAL */}
          <button
            onClick={() => {
              navigate("/oficinaVirtual");
              handleClose();
            }}
            className="
              flex items-center gap-3 px-4 py-3 rounded-xl
              bg-white border border-[#DCDCDC] 
              hover:bg-[#F5F5F5] transition
            "
          >
            <Briefcase size={18} className="text-[#5C2E0B]" />
            Ir a la Oficina Virtual
          </button>

          {/* IR AL HOME */}
          <button
            onClick={() => {
              navigate("/");
              handleClose();
            }}
            className="
              flex items-center gap-3 px-4 py-3 rounded-xl
              bg-white border border-[#DCDCDC]
              hover:bg-[#F5F5F5] transition
            "
          >
            <Home size={18} className="text-[#5C2E0B]" />
            Ir al Inicio
          </button>

          {/* PREFERENCIAS */}
          <button
            onClick={() => {
              alert("⚙️ Preferencias del usuario (en construcción)");
            }}
            className="
              flex items-center gap-3 px-4 py-3 rounded-xl
              bg-white border border-[#DCDCDC]
              hover:bg-[#F5F5F5] transition
            "
          >
            <Settings size={18} className="text-[#5C2E0B]" />
            Preferencias del usuario
          </button>

          {/* PRIVACIDAD */}
          <button
            onClick={() => {
              alert("🔐 Centro de privacidad (en construcción)");
            }}
            className="
              flex items-center gap-3 px-4 py-3 rounded-xl
              bg-white border border-[#DCDCDC]
              hover:bg-[#F5F5F5] transition
            "
          >
            <Shield size={18} className="text-[#5C2E0B]" />
            Centro de privacidad
          </button>

          {/* CERRAR SESIÓN */}
          <button
            onClick={() => {
              navigate("/login");
              handleClose();
            }}
            className="
              flex items-center gap-3 px-4 py-3 rounded-xl
              bg-red-600 text-white font-medium
              hover:bg-red-700 transition
            "
          >
            <LogOut size={18} />
            Cerrar sesión
          </button>
        </div>
      </aside>
    </>
  );
}
