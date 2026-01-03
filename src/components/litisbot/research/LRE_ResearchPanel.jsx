// ============================================================================
// 🦉 LRE_ResearchPanel (Investigación Jurídica – Enterprise Hybrid Edition)
// ----------------------------------------------------------------------------
// - Desktop → Drawer lateral (40% ancho)
// - Mobile → Fullscreen
// - Cierre fiable y sin overlays atascados
// - Cards limpias y con colores institucionales (rojo / blanco puro / marrón)
// - Integración con LitisBotChatPro vía props { open, onClose, onSelect }
// ============================================================================

import React, { useState, useEffect } from "react";
import { X } from "lucide-react";

// Simulación de búsqueda (luego se conecta a tu backend real)
async function fakeSearchJuris(query) {
  if (query.length < 3) return [];
  await new Promise((r) => setTimeout(r, 400)); // Simulación delay
  return [
    {
      id: "cas-001",
      titulo: "Casación 001-2020 — Contrato y buena fe",
      sumilla: "Análisis de responsabilidad civil y buena fe contractual.",
    },
    {
      id: "cas-702-2019",
      titulo: "Casación 702-2019/Cusco — Nulidad de acto jurídico",
      sumilla: "Requisitos esenciales, error, dolo y vicios de voluntad.",
    },
  ];
}

export default function LRE_ResearchPanel({
  open = false,
  onClose = () => {},
  onSelect = () => {},
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  // Búsqueda automática
  useEffect(() => {
    let active = true;

    async function search() {
      if (query.trim().length < 3) {
        setResults([]);
        return;
      }
      setLoading(true);
      const res = await fakeSearchJuris(query.trim());
      if (active) {
        setResults(res);
        setLoading(false);
      }
    }

    search();
    return () => {
      active = false;
    };
  }, [query]);

  // 🎨 Estilos responsivos (Drawer Desktop, Fullscreen Mobile)
  const panelClasses = [
    "fixed top-0 right-0 h-full bg-white shadow-2xl z-[200] transition-transform duration-300 ease-out",
    "flex flex-col",
    "border-l border-[#E6E6E8]",
    "overflow-hidden",
    "w-full md:w-[40%]",
    open ? "translate-x-0" : "translate-x-full",
  ].join(" ");

  return (
    <>
      {/* BACKDROP MOBILE */}
      {open && (
        <div
          className="fixed inset-0 bg-black/40 z-[180] md:hidden"
          onClick={onClose}
        />
      )}

      {/* PANEL */}
      <div className={panelClasses}>
        {/* HEADER */}
        <div className="flex items-center justify-between px-5 py-4 border-b bg-[#5C2E0B] text-white">
          <h2 className="text-lg font-semibold">Investigación jurídica</h2>

          <button
            type="button"
            onClick={onClose}
            className="p-2 hover:bg-black/20 rounded-full transition"
            title="Cerrar"
          >
            <X size={20} />
          </button>
        </div>

        {/* BUSCADOR */}
        <div className="p-4 border-b bg-[#FFF]">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar jurisprudencia (mínimo 3 letras)…"
            className="w-full px-4 py-2 rounded-xl border border-[#D6D6DB] focus:ring-2 focus:ring-[#C1121F] outline-none"
          />
        </div>

        {/* CONTENIDO */}
        <div className="flex-1 overflow-auto p-4 bg-[#FAFAFA]">
          {/* LOADING */}
          {loading && (
            <div className="text-center text-[#7A7A85] py-8">
              Buscando jurisprudencia…
            </div>
          )}

          {/* VACÍO */}
          {!loading && results.length === 0 && query.length >= 3 && (
            <div className="text-center text-[#9A9AA3] py-6">
              No se encontraron resultados.
            </div>
          )}

          {/* LISTADO */}
          {!loading && results.length > 0 && (
            <div className="flex flex-col gap-3">
              {results.map((item) => (
                <button
                  key={item.id}
                  onClick={() => onSelect(item)}
                  className="w-full text-left p-4 bg-white shadow-sm border border-[#E6E6E8] rounded-xl hover:shadow-md transition"
                >
                  <div className="text-[15px] font-semibold text-[#5C2E0B]">
                    {item.titulo}
                  </div>
                  <div className="mt-1 text-[13px] text-[#6C6C74]">
                    {item.sumilla}
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* INSIGHTS (placeholder) */}
          <div className="mt-8 border-t pt-4 text-[14px]">
            <h3 className="font-semibold text-[#5C2E0B] mb-2">
              Insights de análisis
            </h3>
            <p className="text-[#6C6C74]">
              Aquí verás resúmenes, línea argumental, ratio decidendi,
              contradicciones y vínculos relevantes conforme vayas agregando
              jurisprudencia al contexto.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
