// ============================================================
// ChatModals.jsx
// ------------------------------------------------------------
// Conjunto de modales reutilizables para el ecosistema LitisBot.
// - BaseModal: estilo unificado
// - RenameChatModal
// - CreateCaseModal
// - ConfirmDeleteModal
// ============================================================

import React from "react";
import { FaTimes, FaRegCheckCircle } from "react-icons/fa";

/* ------------------------------------------------------------
   BaseModal (NO MODIFICAR)
------------------------------------------------------------ */
export function BaseModal({ open, onClose, children, width = "max-w-md" }) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[95] flex items-center justify-center px-4"
      style={{ background: "rgba(0,0,0,0.35)" }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
      aria-modal="true"
      role="dialog"
    >
      <div
        className={`w-full ${width} bg-white rounded-2xl shadow-xl border border-[#E2E2E8] p-5`}
      >
        {children}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------
   Modal: Renombrar chat
------------------------------------------------------------ */
export function RenameChatModal({
  open,
  value,
  onChange,
  onCancel,
  onSave,
}) {
  return (
    <BaseModal open={open} onClose={onCancel}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-[#3A2A1A]">Renombrar chat</h3>
        <button
          className="w-9 h-9 rounded-lg hover:bg-[#F7F7FA] flex items-center justify-center"
          onClick={onCancel}
        >
          <FaTimes />
        </button>
      </div>

      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border rounded-xl px-3 py-2 outline-none"
        placeholder="Ej: Caso Luzmila – apelación"
        autoFocus
        style={{ borderColor: "rgba(92,46,11,0.25)" }}
      />

      <div className="mt-4 flex justify-end gap-2">
        <button
          className="px-4 py-2 rounded-xl border hover:bg-[#F7F7FA]"
          onClick={onCancel}
        >
          Cancelar
        </button>
        <button
          className="px-4 py-2 rounded-xl text-white"
          style={{ background: "#5C2E0B" }}
          onClick={onSave}
        >
          Guardar
        </button>
      </div>
    </BaseModal>
  );
}

/* ------------------------------------------------------------
   Modal: Crear caso
------------------------------------------------------------ */
export function CreateCaseModal({
  open,
  titulo,
  cliente,
  materia,
  onTitulo,
  onCliente,
  onMateria,
  onCancel,
  onCreate,
}) {
  return (
    <BaseModal open={open} onClose={onCancel} width="max-w-lg">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-[#3A2A1A] flex items-center gap-2">
          <FaRegCheckCircle className="text-[#5C2E0B]" />
          Crear caso
        </h3>

        <button
          className="w-9 h-9 rounded-lg hover:bg-[#F7F7FA] flex items-center justify-center"
          onClick={onCancel}
        >
          <FaTimes />
        </button>
      </div>

      <div className="text-[13px] text-[#6B6B76] leading-relaxed mb-4">
        Organiza tus chats en casos para mejor estrategia jurídica.
      </div>

      <div className="grid grid-cols-1 gap-3">
        <input
          value={titulo}
          onChange={(e) => onTitulo(e.target.value)}
          placeholder="Título del caso"
          className="w-full border rounded-xl px-3 py-2 outline-none"
          style={{ borderColor: "rgba(92,46,11,0.25)" }}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input
            value={cliente}
            onChange={(e) => onCliente(e.target.value)}
            placeholder="Cliente (opcional)"
            className="border rounded-xl px-3 py-2 outline-none"
            style={{ borderColor: "rgba(92,46,11,0.25)" }}
          />
          <input
            value={materia}
            onChange={(e) => onMateria(e.target.value)}
            placeholder="Materia (opcional)"
            className="border rounded-xl px-3 py-2 outline-none"
            style={{ borderColor: "rgba(92,46,11,0.25)" }}
          />
        </div>
      </div>

      <div className="mt-4 flex justify-end gap-2">
        <button
          className="px-4 py-2 rounded-xl border hover:bg-[#F7F7FA]"
          onClick={onCancel}
        >
          Cancelar
        </button>
        <button
          className="px-4 py-2 rounded-xl text-white"
          style={{ background: "#5C2E0B" }}
          onClick={onCreate}
        >
          Crear caso
        </button>
      </div>
    </BaseModal>
  );
}

/* ------------------------------------------------------------
   Modal: Confirm delete
------------------------------------------------------------ */
export function ConfirmDeleteModal({ open, title = "", onCancel, onConfirm }) {
  return (
    <BaseModal open={open} onClose={onCancel}>
      <h3 className="text-[15px] font-semibold text-[#3A2A1A]">
        ¿Eliminar "{title}"?
      </h3>

      <p className="text-[13px] mt-2 mb-4 text-[#6B6B76]">
        Esta acción no borra datos del backend, solo de tu vista local.
      </p>

      <div className="flex justify-end gap-2">
        <button
          className="px-4 py-2 rounded-xl border hover:bg-[#F7F7FA]"
          onClick={onCancel}
        >
          Cancelar
        </button>
        <button
          className="px-4 py-2 rounded-xl text-white bg-red-600"
          onClick={onConfirm}
        >
          Eliminar
        </button>
      </div>
    </BaseModal>
  );
}
