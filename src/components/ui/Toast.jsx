import React, { useEffect } from "react";

export default function Toast({ toast, setToast, autoClose = 3000 }) {
  useEffect(() => {
    if (toast.show && autoClose) {
      const timeout = setTimeout(() => {
        setToast((t) => ({ ...t, show: false }));
      }, autoClose);
      return () => clearTimeout(timeout);
    }
  }, [toast.show, autoClose, setToast]);

  if (!toast.show) return null;

  // Colores institucionales: verde para éxito, rojo para error, azul para info
  const color =
    toast.type === "success"
      ? "bg-green-600"
      : toast.type === "error"
      ? "bg-red-600"
      : "bg-[#b03a1a]"; // Info o warning

  return (
    <div
      className={`fixed top-5 left-1/2 z-[9999] -translate-x-1/2 px-8 py-3 rounded-xl shadow-lg font-bold text-white transition-all duration-300 ${color} flex items-center gap-3`}
      style={{ minWidth: "240px", maxWidth: "90vw" }}
      role="alert"
    >
      <span>
        {toast.type === "success" && "✔️ "}
        {toast.type === "error" && "❌ "}
        {toast.type !== "success" && toast.type !== "error" && "ℹ️ "}
        {toast.message}
      </span>
      <button
        className="ml-4 text-xl font-bold hover:text-yellow-200 focus:outline-none"
        onClick={() => setToast((t) => ({ ...t, show: false }))}
        aria-label="Cerrar notificación"
        tabIndex={0}
      >
        ×
      </button>
    </div>
  );
}

