// ============================================================
// 🦉 ChatRightSidebar.jsx (Estilo WestLaw / LexisNexis)
// ------------------------------------------------------------
// Panel profesional de herramientas jurídicas con categorías:
// Investigación · Productividad · Escritura Jurídica · Utilidades
// ============================================================

import React from "react";
import {
  FaSearch,
  FaBook,
  FaBalanceScale,
  FaTools,
  FaClock,
  FaBell,
  FaFileAlt,
  FaPenNib,
  FaMicroscope,
  FaGlobe,
  FaFileSignature,
  FaCalculator,
} from "react-icons/fa";

export default function ChatRightSidebar({
  open,
  onClose,
  onSelectTool,
  pro = false,
}) {
  if (!open) return null;

  const CATEGORIAS = [
    {
      titulo: "Investigación Jurídica",
      icon: <FaMicroscope className="text-[#5C2E0B]" />,
      items: [
        { key: "juris", label: "Buscar jurisprudencia", pro: false },
        { key: "doctrina", label: "Doctrina y análisis", pro: true },
        { key: "analizar_archivo", label: "Análisis de documentos", pro: true },
        { key: "osce", label: "Ley de Contrataciones / OSCE", pro: false },
      ],
    },

    {
      titulo: "Productividad Profesional",
      icon: <FaClock className="text-[#5C2E0B]" />,
      items: [
        { key: "agenda", label: "Agenda judicial", pro: true },
        { key: "recordatorios", label: "Recordatorios", pro: true },
        { key: "audiencia", label: "Modo audiencia", pro: true },
        { key: "notas", label: "Notas rápidas", pro: false },
      ],
    },

    {
      titulo: "Escritura Jurídica",
      icon: <FaPenNib className="text-[#5C2E0B]" />,
      items: [
        { key: "crear_escrito", label: "Generar escrito", pro: false },
        { key: "plantillas", label: "Plantillas legales", pro: true },
        { key: "contratos", label: "Modelos de contrato", pro: true },
      ],
    },

    {
      titulo: "Utilidades para Abogados",
      icon: <FaTools className="text-[#5C2E0B]" />,
      items: [
        { key: "traducir", label: "Traductor legal", pro: false },
        { key: "multilingue", label: "Consultas multilingüe", pro: false },
        { key: "tercio_pena", label: "Tercio de pena", pro: false },
        { key: "liquidacion", label: "Liquidación laboral", pro: false },
        { key: "calculo", label: "Cálculos legales", pro: true },
      ],
    },
  ];

  return (
    <div
      className="fixed inset-0 z-40 flex justify-end"
      style={{ backgroundColor: "rgba(0,0,0,0.25)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <aside
        className="
          w-[300px] h-full bg-white border-l shadow-xl
          flex flex-col overflow-y-auto
        "
      >
        {/* Header */}
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="font-semibold text-[18px] flex items-center gap-2 text-[#5C2E0B]">
            <FaSearch /> Herramientas LitisBot
          </h2>
          <button
            onClick={onClose}
            className="text-[#5C2E0B] text-xl font-bold hover:opacity-70"
          >
            ×
          </button>
        </div>

        {/* CATEGORÍAS */}
        <div className="flex-1 p-3 space-y-5">
          {CATEGORIAS.map((cat) => (
            <div key={cat.titulo} className="space-y-2">
              <div className="flex items-center gap-2 text-[#5C2E0B] font-bold">
                {cat.icon}
                {cat.titulo}
              </div>

              <div className="pl-7 space-y-1">
                {cat.items.map((item) => (
                  <button
                    key={item.key}
                    onClick={() => {
                      if (item.pro && !pro) {
                        alert("Requiere plan PRO");
                        return;
                      }
                      onSelectTool(item.key);
                    }}
                    className="
                      w-full text-left px-3 py-2 rounded-lg text-sm
                      hover:bg-[#FFF5E6] transition-colors
                    "
                  >
                    {item.label}
                    {item.pro && (
                      <span className="ml-2 text-[11px] px-2 py-[2px] rounded-full bg-yellow-200 text-yellow-800">
                        PRO
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </aside>
    </div>
  );
}
