import React from "react";

export default function HerramientaModal({ open, onClose, children }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Caja */}
      <div
        className="
          relative bg-white
          w-[95vw] max-w-2xl
          max-h-[90vh] overflow-auto
          rounded-2xl shadow-2xl
          p-6
        "
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cerrar */}
        <button
          onClick={onClose}
          className="
            absolute top-3 right-3
            w-8 h-8 flex items-center justify-center
            rounded-full
            hover:bg-black/10
          "
          aria-label="Cerrar"
        >
          ✕
        </button>

        {/* CONTENIDO REAL */}
        {children}
      </div>
    </div>
  );
}
