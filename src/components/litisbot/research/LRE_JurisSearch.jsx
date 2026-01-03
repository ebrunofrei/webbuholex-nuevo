// src/components/litisbot/research/LRE_JurisSearch.jsx
import React, { useState, useEffect, useCallback } from "react";
import { FaSearch, FaPlus, FaInfoCircle } from "react-icons/fa";

/* 
   🔎 Buscador legal: Jurisprudencia
   - Cancela solapamientos
   - Modo enterprise (UX abogado)
   - Espera backend real: /api/juris/search?q=
   - Usa onAddContext(doc) → envía la resolución al "context stack"
*/

export default function LRE_JurisSearch({ onAddContext }) {
  const [query, setQuery] = useState("");
  const [resultados, setResultados] = useState([]);
  const [loading, setLoading] = useState(false);
  const [cancelToken, setCancelToken] = useState(null);

  // Debounce simple
  useEffect(() => {
    const id = setTimeout(() => {
      if (query.trim().length >= 3) buscar(query.trim());
      else setResultados([]);
    }, 300);
    return () => clearTimeout(id);
  }, [query]);

  const buscar = useCallback(
    async (texto) => {
      if (cancelToken) cancelToken.abort();

      const controller = new AbortController();
      setCancelToken(controller);
      setLoading(true);

      try {
        // 👇 Backend real cuando tú indiques
        const resp = await fetch(`/api/juris/search?q=${encodeURIComponent(texto)}`, {
          signal: controller.signal,
        });

        if (!resp.ok) throw new Error("Error en servidor");

        const data = await resp.json();

        setResultados(Array.isArray(data) ? data : data.resultados || []);
      } catch (err) {
        if (err.name !== "AbortError") {
          console.error("[JurisSearch] Error:", err);
        }
      } finally {
        setLoading(false);
      }
    },
    [cancelToken]
  );

  return (
    <div className="flex flex-col gap-4">
      {/* Input buscador */}
      <div className="flex items-center gap-2 px-3 py-2 rounded-xl border"
        style={{ borderColor: "rgba(92,46,11,0.25)" }}>
        <FaSearch className="text-[#5C2E0B]" />
        <input
          type="text"
          placeholder="Buscar jurisprudencia (mínimo 3 letras)…"
          className="flex-1 outline-none text-[15px]"
          style={{ color: "#5C2E0B" }}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {/* Estado de carga */}
      {loading && (
        <p className="text-[14px] text-[#5C2E0B] opacity-70">
          Buscando resoluciones…
        </p>
      )}

      {/* Resultados */}
      <div className="flex flex-col gap-3">
        {resultados.map((doc) => (
          <JurisCard key={doc._id || doc.id} doc={doc} onAddContext={onAddContext} />
        ))}

        {!loading && query.length >= 3 && resultados.length === 0 && (
          <p className="text-[14px] text-[#5C2E0B] opacity-60">
            No se encontraron resultados.
          </p>
        )}
      </div>
    </div>
  );
}

/* ============================================================
   💼 Card jurídica (estilo profesional)
============================================================ */
function JurisCard({ doc, onAddContext }) {
  const titulo =
    doc.titulo || doc.nombre || doc.sumilla || "Resolución sin título";

  return (
    <div
      className="p-4 rounded-xl border shadow-sm flex flex-col gap-2 cursor-pointer hover:shadow-md transition"
      style={{ borderColor: "rgba(92,46,11,0.25)" }}
    >
      <p className="font-semibold text-[15px] text-[#5C2E0B] leading-tight">
        {titulo}
      </p>

      {doc.numeroExpediente && (
        <p className="text-[13px] text-[#5C2E0B] opacity-80">
          <FaInfoCircle className="inline mr-1" />
          Exp. {doc.numeroExpediente}
        </p>
      )}

      {doc.especialidad && (
        <p className="text-[12px] text-[#5C2E0B] opacity-70">
          Especialidad: {doc.especialidad}
        </p>
      )}

      <button
        onClick={() => onAddContext(doc)}
        className="mt-2 px-3 py-1 rounded-lg flex items-center gap-2 text-sm font-semibold"
        style={{ background: "#5C2E0B", color: "white" }}
      >
        <FaPlus />
        Añadir al contexto
      </button>
    </div>
  );
}
