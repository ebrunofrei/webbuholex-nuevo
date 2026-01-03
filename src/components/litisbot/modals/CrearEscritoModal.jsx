// ============================================================================
// 🦉 CrearEscritoModal (Enterprise – Redacción Jurídica)
// ----------------------------------------------------------------------------
// Modal profesional para que el abogado genere escritos:
// - Limpio, minimalista, orientado al flujo profesional
// - NO redacta. Solo emite un evento:
//      window.dispatchEvent(
//         new CustomEvent("litisbot:crearEscrito", { detail: {...} })
//      );
//
// El Engine escucha y produce el escrito según LitisBrain.
// ============================================================================

import React, { useState } from "react";
import { X, FileText, PenLine, Landmark, Scale } from "lucide-react";

export default function CrearEscritoModal({ open, onClose }) {
  if (!open) return null;

  const [tipo, setTipo] = useState("");
  const [detalle, setDetalle] = useState("");

  const tipos = [
    { id: "petitorio", label: "Petitorio simple", icon: <Scale size={18} /> },
    { id: "demanda", label: "Demanda", icon: <Landmark size={18} /> },
    { id: "apelacion", label: "Apelación", icon: <PenLine size={18} /> },
    { id: "oposicion", label: "Oposición / escrito breve", icon: <FileText size={18} /> },
    { id: "informe", label: "Informe jurídico", icon: <PenLine size={18} /> },
    { id: "alegato", label: "Alegato de clausura", icon: <PenLine size={18} /> },
    { id: "carta", label: "Carta notarial", icon: <FileText size={18} /> },
  ];

  const enviar = () => {
    if (!tipo) return;

    window.dispatchEvent(
      new CustomEvent("litisbot:crearEscrito", {
        detail: {
          tipo,
          detalle: detalle.trim(),
        },
      })
    );

    if (onClose) onClose();
  };

  return (
    <div className="fixed inset-0 z-[9990] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-xl w-[92%] max-w-lg p-6 border border-[#EEE]">

        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-[#3A2A1A]">
            Crear escrito jurídico
          </h2>

          <button
            className="p-2 rounded-full hover:bg-gray-100"
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </div>

        {/* Tipos de escrito */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          {tipos.map((t) => (
            <button
              key={t.id}
              onClick={() => setTipo(t.id)}
              className={[
                "flex flex-col items-center justify-center gap-2 p-4 border rounded-xl transition",
                tipo === t.id
                  ? "bg-[#5C2E0B] text-white"
                  : "bg-white border-[#EEE] text-[#3A2A1A] hover:bg-[#FAFAFA]",
              ].join(" ")}
            >
              <div>{t.icon}</div>
              <span className="text-sm">{t.label}</span>
            </button>
          ))}
        </div>

        {/* Área opcional de detalles */}
        <div className="mb-4">
          <label className="block text-sm mb-1 text-[#3A2A1A]">
            Detalles adicionales (opcional)
          </label>
          <textarea
            value={detalle}
            onChange={(e) => setDetalle(e.target.value)}
            placeholder="Ej.: señalizar agravios, hechos relevantes, enfoque deseado, citas opcionales…"
            className="
              w-full min-h-[90px] p-3 border rounded-xl bg-white 
              text-[#3A2A1A] outline-none resize-none
              focus:border-[#5C2E0B]
            "
          />
        </div>

        {/* Footer acciones */}
        <div className="flex justify-end gap-2 mt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-[#DDD] text-[#3A2A1A] hover:bg-gray-100"
          >
            Cancelar
          </button>

          <button
            onClick={enviar}
            disabled={!tipo}
            className={[
              "px-4 py-2 rounded-xl font-semibold transition",
              tipo
                ? "bg-[#5C2E0B] text-white hover:bg-[#4A2308]"
                : "bg-[#E5E5E5] text-[#999] cursor-not-allowed",
            ].join(" ")}
          >
            Generar escrito
          </button>
        </div>
      </div>
    </div>
  );
}
