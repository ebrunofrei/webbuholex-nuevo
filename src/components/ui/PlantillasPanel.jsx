// src/components/ui/PlantillasPanel.jsx
/* ============================================================
   📄 PlantillasPanel
   ------------------------------------------------------------
   - Explorador de plantillas de escritos
   - Lista + previsualización
   - Pensado para enganchar luego con:
       · Autocompletado por IA
       · Envío directo al chat / editor
============================================================ */

import React, { useMemo, useState } from "react";

// 🔹 Demo local de plantillas (luego podemos cargarlas desde API/Mongo)
const PLANTILLAS_DEMO = [
  {
    id: "demanda-alimentos",
    titulo: "Demanda de alimentos para menor de edad",
    categoria: "Familia",
    jurisdiccion: "Perú",
    nivel: "Básico",
    resumen:
      "Modelo base de demanda de alimentos con pretensión de pensión mensual, devengados y costas.",
    tags: ["demanda", "familia", "alimentos"],
  },
  {
    id: "contestacion-demanda",
    titulo: "Contestación de demanda civil",
    categoria: "Civil",
    jurisdiccion: "Perú",
    nivel: "Intermedio",
    resumen:
      "Escrito de contestación con excepciones previas, oposición a medios probatorios y tacha.",
    tags: ["contestación", "civil", "defensa"],
  },
  {
    id: "medida-cautelar-innovativa",
    titulo: "Solicitud de medida cautelar innovativa",
    categoria: "Procesal",
    jurisdiccion: "Perú",
    nivel: "Avanzado",
    resumen:
      "Plantilla para medida cautelar innovativa con análisis de verosimilitud, peligro en la demora y contracautela.",
    tags: ["cautelar", "procesal", "innovativa"],
  },
];

export default function PlantillasPanel() {
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState(PLANTILLAS_DEMO[0]?.id || null);

  const plantillaSeleccionada = useMemo(
    () => PLANTILLAS_DEMO.find((p) => p.id === selectedId) || null,
    [selectedId]
  );

  const filtradas = useMemo(() => {
    if (!query.trim()) return PLANTILLAS_DEMO;
    const q = query.toLowerCase();
    return PLANTILLAS_DEMO.filter(
      (p) =>
        p.titulo.toLowerCase().includes(q) ||
        p.categoria.toLowerCase().includes(q) ||
        (p.tags || []).some((t) => t.toLowerCase().includes(q))
    );
  }, [query]);

  return (
    <div className="flex flex-col h-full w-full bg-white">
      {/* HEADER */}
      <header className="px-6 py-4 border-b border-[#E2E2E8] bg-white flex items-center justify-between gap-4">
        <div>
          <h1 className="text-[18px] font-semibold text-[#3A2A1A]">
            Plantillas de escritos
          </h1>
          <p className="text-[13px] text-[#8C8C96]">
            Explora modelos base y próximamente ajustaremos datos y estilo con
            ayuda de LitisBot.
          </p>
        </div>

        {/* Futuro toggle PRO, filtros avanzados, etc. */}
        <span className="text-[11px] px-3 py-1 rounded-full bg-[#FFF1CC] text-[#7A5500] font-semibold">
          Vista preliminar • beta
        </span>
      </header>

      {/* CONTENIDO PRINCIPAL */}
      <div className="flex-1 flex min-h-0">
        {/* LISTA DE PLANTILLAS */}
        <aside className="w-80 min-w-[18rem] border-r border-[#E2E2E8] flex flex-col">
          {/* Buscador */}
          <div className="p-3 border-b border-[#F0F0F4]">
            <input
              type="text"
              placeholder="Buscar por título, materia, tag…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="
                w-full text-[13px] px-3 py-2 rounded-lg border border-[#E2E2E8]
                focus:outline-none focus:ring-2 focus:ring-[#C27A3F]/40
              "
            />
          </div>

          {/* Lista */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2 text-[13px]">
            {filtradas.map((p) => {
              const active = p.id === selectedId;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setSelectedId(p.id)}
                  className={`
                    w-full text-left px-3 py-2 rounded-lg border transition
                    ${
                      active
                        ? "bg-[#FFF5E6] border-[#F2D4A4] text-[#5C2E0B]"
                        : "bg-white hover:bg-[#F7F7FA] border-transparent text-[#3A2A1A]"
                    }
                  `}
                >
                  <div className="font-semibold truncate text-[13px]">
                    {p.titulo}
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-[11px] text-[#8C8C96]">
                    <span>{p.categoria}</span>
                    <span className="w-[3px] h-[3px] rounded-full bg-[#D0D0D8]" />
                    <span>{p.nivel}</span>
                  </div>
                </button>
              );
            })}

            {filtradas.length === 0 && (
              <p className="text-[12px] text-[#A0A0AE]">
                No se encontraron plantillas para “{query}”.
              </p>
            )}
          </div>
        </aside>

        {/* PREVISUALIZADOR */}
        <section className="flex-1 min-w-0 flex flex-col">
          {plantillaSeleccionada ? (
            <div className="h-full flex flex-col px-6 py-5">
              <div className="mb-4">
                <h2 className="text-[17px] font-semibold text-[#3A2A1A] mb-1">
                  {plantillaSeleccionada.titulo}
                </h2>
                <div className="flex flex-wrap items-center gap-2 text-[11px]">
                  <span className="px-2 py-[2px] rounded-full bg-[#F5F3FF] text-[#5C2E0B] font-medium">
                    {plantillaSeleccionada.categoria}
                  </span>
                  <span className="px-2 py-[2px] rounded-full bg-[#FFF1CC] text-[#7A5500] font-medium">
                    {plantillaSeleccionada.nivel}
                  </span>
                  <span className="px-2 py-[2px] rounded-full bg-[#F7F7FA] text-[#666678]">
                    {plantillaSeleccionada.jurisdiccion}
                  </span>
                </div>
              </div>

              {/* “Preview” simple del cuerpo (futuro: markdown / editor) */}
              <div
                className="
                  flex-1 rounded-xl border border-[#E2E2E8] bg-[#FAFAFD]
                  px-5 py-4 text-[13px] text-[#4A3A2A] leading-relaxed
                  overflow-auto
                "
              >
                <p className="mb-3 font-medium text-[#5C2E0B]">
                  Resumen de la plantilla
                </p>
                <p className="mb-4">{plantillaSeleccionada.resumen}</p>

                <p className="text-[12px] text-[#8C8C96]">
                  Próximamente verás aquí el texto completo del modelo, con
                  campos inteligentes (nombre de partes, juzgado, expediente,
                  fechas, montos) para autocompletarlo con IA según el caso.
                </p>
              </div>

              {/* Botón de acción (todavía sin lógica para no tocar Engine) */}
              <div className="mt-4 flex justify-end">
                <button
                  type="button"
                  disabled
                  className="
                    px-4 py-2 rounded-lg text-[13px] font-semibold
                    bg-[#C27A3F] text-white opacity-60 cursor-not-allowed
                  "
                >
                  Usar esta plantilla (próximamente)
                </button>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-[13px] text-[#A0A0AE]">
              Selecciona una plantilla en la parte izquierda para verla aquí.
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
