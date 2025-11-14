// src/components/JurisprudenciaSearch.jsx
// ============================================================
// 🦉 BúhoLex | Buscador de Jurisprudencia / Research (v3)
// - initialQuery: auto-búsqueda al montar
// - autoOnType: busca solo al dejar de escribir (debounce)
// ============================================================

import React, { useState, useRef, useEffect } from "react";
import { searchJurisprudencia } from "@/services/researchClientService";

/**
 * Props:
 * - className?: string
 * - variant?: "full" | "compact"
 * - initialQuery?: string
 * - autoOnType?: boolean             → true = busca mientras escribes
 * - onSelectItem?: (item) => void
 */
export default function JurisprudenciaSearch({
  className = "",
  variant = "full",
  initialQuery = "",
  autoOnType = false,
  onSelectItem,
}) {
  const [q, setQ] = useState(initialQuery || "");
  const [items, setItems] = useState([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState("");
  const [lastQuery, setLastQuery] = useState("");

  const abortRef = useRef(null);
  const debounceRef = useRef(null);

  const doSearch = async (queryFromOutside) => {
    setTouched(true);
    setError("");

    const query = (queryFromOutside ?? q).trim();
    if (!query) {
      setItems([]);
      setCount(0);
      setLastQuery("");
      return;
    }

    // Cancelamos petición anterior
    if (abortRef.current) {
      abortRef.current.abort();
    }
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);

    try {
      const data = await searchJurisprudencia(query, {
        signal: controller.signal,
      });

      if (data.emptyQuery) {
        setItems([]);
        setCount(0);
        setLastQuery("");
      } else {
        setItems(data.items || []);
        setCount(data.count || 0);
        setLastQuery(data.q || query);
      }
    } catch (err) {
      if (err.name === "AbortError") return;
      console.error(err);
      setError(
        "Ocurrió un problema al consultar la jurisprudencia. Inténtalo nuevamente."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    doSearch();
  };

  // 🔄 auto-búsqueda al montar si hay initialQuery
  useEffect(() => {
    if (initialQuery && initialQuery.trim()) {
      doSearch(initialQuery);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQuery]);

  // 🔄 auto-búsqueda mientras se escribe (debounce)
  useEffect(() => {
    if (!autoOnType) return;
    const query = q.trim();

    // limpiamos timeout anterior
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // si no hay texto, limpiamos resultados pero no buscamos
    if (!query) {
      setItems([]);
      setCount(0);
      setLastQuery("");
      return;
    }

    debounceRef.current = setTimeout(() => {
      doSearch(query);
    }, 600); // 600 ms de espera

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, autoOnType]);

  const hasResults = items && items.length > 0;
  const showEmpty =
    touched && !loading && !error && lastQuery && !hasResults;

  const paddingClasses =
    variant === "compact" ? "p-3 sm:p-4" : "p-4 sm:p-6";
  const titleSize =
    variant === "compact" ? "text-base sm:text-lg" : "text-lg sm:text-xl";
  const snippetSize =
    variant === "compact"
      ? "text-[11px] sm:text-xs"
      : "text-xs sm:text-sm";

  return (
    <div
      className={`w-full ${
        variant === "full" ? "max-w-3xl mx-auto" : ""
      } bg-white/80 rounded-xl shadow-md border border-brown-100 ${paddingClasses} ${className}`}
    >
      {/* Título */}
      <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h2 className={`${titleSize} font-semibold text-neutral-800`}>
            Buscador de Jurisprudencia
          </h2>
          <p className="text-xs sm:text-sm text-neutral-500">
            Escribe una casación, expediente o tema jurídico. Ejemplo:
            <span className="font-medium">
              {" "}
              “casación 702-2019 Cusco”
            </span>
            .
          </p>
        </div>
        {hasResults && (
          <span className="text-xs sm:text-sm text-neutral-500">
            {count} resultado{count !== 1 ? "s" : ""} para{" "}
            <span className="font-semibold">“{lastQuery}”</span>
          </span>
        )}
      </div>

      {/* Formulario */}
      <form
        onSubmit={handleSubmit}
        className="flex flex-col sm:flex-row gap-3 mb-4"
      >
        <input
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Ej. casación 702-2019 Huánuco, responsabilidad civil, nulidad de acto jurídico…"
          className="flex-1 px-3 py-2 rounded-lg border border-neutral-300 text-sm focus:outline-none focus:ring-2 focus:ring-amber-600/70 focus:border-amber-600"
        />
        {!autoOnType && (
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center justify-center px-4 py-2 rounded-lg text-sm font-semibold text-white bg-amber-700 hover:bg-amber-800 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? "Buscando…" : "Buscar"}
          </button>
        )}
      </form>

      {/* Estado: error */}
      {error && (
        <div className="mb-3 text-xs sm:text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      {/* Estado: vacío */}
      {showEmpty && (
        <div className="mb-3 text-xs sm:text-sm text-neutral-600 bg-neutral-50 border border-neutral-200 rounded-lg px-3 py-2">
          No se encontraron resultados para{" "}
          <span className="font-semibold">“{lastQuery}”</span>.
          <br />
          Prueba con:
          <ul className="list-disc list-inside mt-1">
            <li>Otra combinación de palabras clave.</li>
            <li>
              Incluir número de casación, año y ciudad (ej. “casación
              20702-2019 Cusco”).
            </li>
            <li>
              Términos jurídicos relevantes:{" "}
              <span className="italic">
                responsabilidad civil, nulidad, prescripción, etc.
              </span>
            </li>
          </ul>
        </div>
      )}

      {/* Lista de resultados */}
      {hasResults && (
        <div
          className={`space-y-3 ${
            variant === "full"
              ? "max-h-[420px] overflow-y-auto pr-1"
              : "max-h-[320px] overflow-y-auto pr-1"
          }`}
        >
          {items.map((item, idx) => {
            const title = item.title || item.Titulo || "Sin título";
            const link = item.link || item.url || "#";
            const snippet =
              item.snippet ||
              item.resumen ||
              item.description ||
              "";
            const source =
              item.displayLink || item.fuente || item.host || "";

            const handleClick = (e) => {
              if (onSelectItem) {
                e.preventDefault();
                onSelectItem(item);
              }
            };

            return (
              <article
                key={`${item.link || item.url || idx}`}
                className="border border-neutral-200 rounded-lg p-3 hover:border-amber-600/60 hover:shadow-sm transition-colors bg-white"
              >
                <header className="mb-1">
                  <a
                    href={link}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={handleClick}
                    className={`${
                      variant === "compact"
                        ? "text-sm sm:text-[15px]"
                        : "text-sm sm:text-base"
                    } font-semibold text-amber-800 hover:text-amber-900 hover:underline`}
                  >
                    {title}
                  </a>
                  {source && (
                    <div className="text-[11px] text-neutral-500">
                      {source}
                    </div>
                  )}
                </header>
                {snippet && (
                  <p className={`${snippetSize} text-neutral-700`}>
                    {snippet}
                  </p>
                )}
              </article>
            );
          })}
        </div>
      )}

      {/* Estado inicial */}
      {!touched && !hasResults && !loading && !error && (
        <div className="text-xs sm:text-sm text-neutral-500 mt-2">
          Ingresa un criterio de búsqueda para consultar en el motor
          de jurisprudencia.
        </div>
      )}
    </div>
  );
}
