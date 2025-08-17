// src/components/Modal.jsx

import React from "react";

export default function Modal({ isOpen, onClose, children }) {
  if (!isOpen) return null;
  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50"
      onClick={onClose} // permite cerrar clickeando fuera del modal
      style={{ animation: "fadeIn .2s" }}
    >
      <div
        className="bg-white p-4 rounded-2xl max-w-full w-[95vw] sm:w-[400px] shadow-xl relative"
        onClick={e => e.stopPropagation()} // evita que el modal se cierre al hacer clic dentro
      >
        <button
          className="absolute top-2 right-2 text-gray-500 hover:text-red-600 text-xl"
          onClick={onClose}
          aria-label="Cerrar modal"
        >
          ×
        </button>
        {children}
      </div>
      <style>{`
        @media (max-width: 640px) {
          .w-[95vw] { width: 95vw; }
        }
        @keyframes fadeIn {
          from { opacity: 0 }
          to { opacity: 1 }
        }
      `}</style>
    </div>
  );
}
