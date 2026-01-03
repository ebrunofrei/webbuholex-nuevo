// ============================================================================
// 🦉 NuevoContextoModal — Creación de CONTEXTO (CANÓNICO)
// ----------------------------------------------------------------------------
// - Backend-first
// - SIN token
// - SIN IA
// - SIN localStorage
// - Contexto ≠ Análisis ≠ Razonamiento
// ============================================================================

import React, { useState, useEffect } from "react";

export default function NuevoContextoModal({
  open,
  onClose,
  onCreated,
}) {
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Reset limpio al abrir/cerrar
  useEffect(() => {
    if (!open) {
      setTitle("");
      setError("");
      setLoading(false);
    }
  }, [open]);

  if (!open) return null;

  // ============================================================
  // CREAR CONTEXTO (BACKEND — SIN TOKEN / SIN IA)
  // ============================================================
  async function handleCreate(e) {
    e.preventDefault();
    if (loading || !title.trim()) return;

    try {
      setLoading(true);
      setError("");

      const res = await fetch("/api/cases", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: title.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "No se pudo crear el contexto");
      }

      // 🔔 Notificar al orquestador (ChatPro)
      const contextoCreado = data.context || data.case || data;
      onCreated?.(contextoCreado);

      onClose();
    } catch (err) {
      setError(err.message || "Error inesperado");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="
          w-full max-w-md
          bg-white
          rounded-2xl
          border border-[#5C2E0B]
          shadow-xl
          p-6
        "
        onClick={(e) => e.stopPropagation()}
      >
        {/* ================= HEADER ================= */}
        <header className="mb-4">
          <h2 className="text-2xl font-semibold text-black">
            Nuevo contexto
          </h2>

          <p className="text-base text-black/70 mt-2 leading-relaxed">
            Los contextos permiten organizar el análisis lógico-jurídico
            desde la tridimensionalidad del derecho
            <span className="italic"> (hecho, norma y valor)</span>.
            <br /><br />
            Cada contexto mantiene sus análisis, archivos e instrucciones
            personalizadas en un solo lugar.
          </p>
        </header>

        {/* ================= FORM ================= */}
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-lg font-medium mb-1">
              Nombre del contexto
            </label>

            <input
              type="text"
              value={title}
              autoFocus
              onChange={(e) => {
                setTitle(e.target.value);
                if (error) setError("");
              }}
              placeholder="Ej. Demanda de alimentos"
              className="
                w-full
                px-4 py-3
                text-lg
                border border-[#5C2E0B]
                rounded-xl
                outline-none
                focus:ring-2 focus:ring-[#5C2E0B]/30
              "
            />
          </div>

          {error && (
            <div className="text-base text-red-700">
              {error}
            </div>
          )}

          {/* ================= ACTIONS ================= */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="
                px-4 py-2
                text-lg
                rounded-lg
                border border-[#5C2E0B]
                hover:bg-black/5
              "
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={loading || !title.trim()}
              className="
                px-5 py-2
                text-lg font-semibold
                rounded-lg
                bg-[#5C2E0B]
                text-white
                disabled:opacity-50
              "
            >
              {loading ? "Creando…" : "Crear contexto"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
