// ============================================================
// 🦉 JurisSearchPane.jsx
// ------------------------------------------------------------
// Panel lateral para búsqueda instantánea de jurisprudencia
// Integración: LitisBotChatPro / LitisBotChatBase
// - Búsqueda por palabras clave
// - Resultados resumidos
// - Enviar al chat como contexto
// ============================================================

import React, { useState } from "react";
import {
  FaSearch,
  FaGavel,
  FaBookOpen,
  FaTimes,
  FaExternalLinkAlt,
  FaArrowCircleRight,
} from "react-icons/fa";

export default function JurisSearchPane({
  open,
  onClose,
  onSelect, // envía el objeto jurisprudencia al chat
  buscarJuris, // función async({ q }) → resultados
}) {
  const [query, setQuery] = useState("");
  const [cargando, setCargando] = useState(false);
  const [resultados, setResultados] = useState([]);
  const [error, setError] = useState("");

  if (!open) return null;

  async function handleBuscar() {
    setError("");
    setResultados([]);

    if (!query.trim()) {
      setError("Escribe un criterio de búsqueda.");
      return;
    }

    try {
      setCargando(true);
      const data = await buscarJuris({ q: query.trim(), num: 10 });

      if (!data || !Array.isArray(data.items || data.results || [])) {
        setError("No se encontraron coincidencias.");
        return;
      }

      const items =
        data.items || data.results || data.citas || [];

      setResultados(items);
    } catch (err) {
      console.error("❌ Error JURIS Search:", err);
      setError("Error consultando jurisprudencia.");
    } finally {
      setCargando(false);
    }
  }

  const handleSelect = (item) => {
    onSelect?.(item);
    onClose?.();
  };

  return (
    <div
      className="fixed inset-0 z-[120] flex justify-end"
      style={{ background: "rgba(0,0,0,0.35)" }}
      onClick={(e) => e.target === e.currentTarget && onClose?.()}
    >
      <div
        className="w-full max-w-md bg-white h-full shadow-xl flex flex-col"
        style={{ borderLeft: "3px solid #5C2E0B" }}
      >
        {/* HEADER */}
        <div className="px-4 py-4 border-b flex items-center justify-between">
          <h2 className="text-lg font-bold flex items-center gap-2 text-[#5C2E0B]">
            <FaGavel />
            Buscar Jurisprudencia
          </h2>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-lg hover:bg-[#F7F7FA] flex items-center justify-center"
          >
            <FaTimes className="text-[#5C2E0B]" />
          </button>
        </div>

        {/* BUSCADOR */}
        <div className="p-4 border-b">
          <div className="flex gap-2">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ej: violencia familiar, casación 1234-2020..."
              className="flex-1 border rounded-lg px-3 py-2 text-sm outline-none"
              style={{ borderColor: "rgba(92,46,11,0.3)" }}
              onKeyDown={(e) => e.key === "Enter" && handleBuscar()}
            />
            <button
              onClick={handleBuscar}
              className="px-4 rounded-lg text-white flex items-center justify-center"
              style={{ background: "#5C2E0B" }}
            >
              <FaSearch />
            </button>
          </div>

          {error && (
            <p className="mt-2 text-sm text-red-700">{error}</p>
          )}
        </div>

        {/* RESULTADOS */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {cargando && (
            <div className="text-center text-[#5C2E0B] text-sm">
              Buscando…
            </div>
          )}

          {!cargando && resultados.length === 0 && (
            <p className="text-sm text-[#8C8C96]">Sin resultados…</p>
          )}

          {resultados.map((r, idx) => {
            const titulo =
              r.title || r.titulo || r.nombre || r.name || "Jurisprudencia";

            const snippet =
              r.snippet ||
              r.descripcion ||
              r.extract ||
              "";

            const link = r.link || r.url || "";

            return (
              <div
                key={idx}
                className="p-3 rounded-xl border shadow-sm hover:shadow-md transition cursor-pointer"
                style={{ borderColor: "rgba(92,46,11,0.2)" }}
              >
                <div
                  className="font-semibold text-[#5C2E0B] text-sm flex items-center gap-2"
                  onClick={() => handleSelect(r)}
                >
                  <FaBookOpen />
                  {titulo}
                </div>

                {snippet && (
                  <p className="text-xs mt-1 text-[#6B6B76] line-clamp-3">
                    {snippet}
                  </p>
                )}

                <div className="flex justify-between items-center mt-2">
                  {/* Abrir en nueva pestaña */}
                  {link ? (
                    <a
                      href={link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-[#5C2E0B] underline flex items-center gap-1"
                    >
                      Ver fuente <FaExternalLinkAlt size={10} />
                    </a>
                  ) : (
                    <span />
                  )}

                  {/* Enviar al chat */}
                  <button
                    onClick={() => handleSelect(r)}
                    className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg"
                    style={{
                      background: "#FFF5E6",
                      border: "1px solid rgba(92,46,11,0.25)",
                      color: "#5C2E0B",
                    }}
                  >
                    Usar en el chat <FaArrowCircleRight />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
}
