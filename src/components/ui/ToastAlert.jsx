import React from "react";

export default function ToastAlert({ open, message, type = "info", onClose }) {
  if (!open) return null;
  let color = "bg-blue-600";
  if (type === "error") color = "bg-red-600";
  if (type === "success") color = "bg-green-600";
  if (type === "warning") color = "bg-yellow-600 text-black";

  return (
    <div
      className={`${color} fixed z-50 left-1/2 -translate-x-1/2 bottom-6 px-6 py-3 rounded-xl shadow-xl text-white flex items-center gap-2 animate-fade-in-up`}
      style={{ minWidth: 220 }}
      role="alert"
    >
      <span>{message}</span>
      <button
        className="ml-4 text-white font-bold"
        onClick={onClose}
        aria-label="Cerrar alerta"
      >
        ×
      </button>
      <style>{`
        @keyframes fade-in-up { 
          from { opacity:0; transform: translateY(30px);}
          to {opacity:1; transform:translateY(0);}
        }
        .animate-fade-in-up { animation: fade-in-up .4s;}
      `}</style>
    </div>
  );
}
