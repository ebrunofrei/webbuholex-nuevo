import React, { useState, useRef, useEffect } from "react";
import { searchJurisprudencia } from "@/services/researchClientService";

const PAGE_SIZE = 5; // cuántos resultados por página quieres mostrar

export default function JurisprudenciaSearch({
  className = "",
  variant = "full",
  initialQuery = "",
  autoOnType = false,
  onSelectItem, // compatibilidad hacia atrás
  onOpenResult, // 🔥 abrir lector/modal global
}) {
  const [q, setQ] = useState(initialQuery || "");
  const [items, setItems] = useState([]);
  const [count, setCount] = useState(0);
  const [totalResults, setTotalResults] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState("");
  const [lastQuery, setLastQuery] = useState("");
  const [disabledMsg, setDisabledMsg] = useState("");

  const abortRef = useRef(null);
  const debounceRef = useRef(null);

  const hasResults = items && items.length > 0;
  const showEmpty =
    touched && !loading && !error && !disabledMsg && lastQuery && !hasResults;

  const paddingClasses =
    variant === "compact" ? "p-3 sm:p-4" : "p-4 sm:p-6";
  const titleSize =
    variant === "compact" ? "text-base sm:text-lg" : "text-lg sm:text-xl";
  const snippetSize =
    variant === "compact" ? "text-[11px] sm:text-xs" : "text-xs sm:text-sm";

  const total = totalResults || count;
  const from = total > 0 ? (page - 1) * PAGE_SIZE + 1 : 0;
  const to = total > 0 ? from + items.length - 1 : 0;
  const canPrev = page > 1;
  const canNext = total > page * PAGE_SIZE;

  /* ---------------------- Core search con paginación ---------------------- */
  const doSearch = async (queryFromOutside, pageOverride = 1) => {
    setTouched(true);
    setError("");
    setDisabledMsg("");

    const query = (queryFromOutside ?? q).trim();
    const currentPage = pageOverride || 1;

    if (!query) {
      setItems([]);
      setCount(0);
      setTotalResults(0);
      setLastQuery("");
      setPage(1);
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
      const start = (currentPage - 1) * PAGE_SIZE + 1;

      const data = await searchJurisprudencia(query, {
        signal: controller.signal,
        start,
        num: PAGE_SIZE,
      });

      console.log("[JurisprudenciaSearch] respuesta API:", data);

      if (!data) {
        setError("No se pudo conectar con el motor de búsqueda.");
        return;
      }

      // flags del backend (motor apagado, etc.)
      if (data.disabled || data.error === "disabled") {
        setDisabledMsg(
          "El motor de búsqueda externo está desactivado por configuración. Habilita ENABLE_RESEARCH y las claves de Google en el backend."
        );
        setItems([]);
        setCount(0);
        setTotalResults(0);
        setLastQuery(query);
        setPage(1);
        return;
      }

      if (data.ok === false && data.msg) {
        setError(data.msg || "Error al consultar la jurisprudencia.");
        setItems([]);
        setCount(0);
        setTotalResults(0);
        setLastQuery(query);
        setPage(1);
        return;
      }

      if (data.emptyQuery) {
        setItems([]);
        setCount(0);
        setTotalResults(0);
        setLastQuery("");
        setPage(1);
        return;
      }

      const nextItems = data.items || [];
      setItems(nextItems);
      setCount(data.count ?? nextItems.length);
      setTotalResults(data.totalResults || data.count || nextItems.length);
      setLastQuery(data.q || query);
      setPage(currentPage);
    } catch (err) {
      if (err.name === "AbortError") return;
      console.error("[JurisprudenciaSearch] Error:", err);
      setError(
        "Ocurrió un problema al consultar la jurisprudencia. Inténtalo nuevamente."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    doSearch(undefined, 1); // siempre reiniciar en página 1
  };

  // 🔄 auto-búsqueda al montar si hay initialQuery
  useEffect(() => {
    if (initialQuery && initialQuery.trim()) {
      setQ(initialQuery);
      doSearch(initialQuery, 1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQuery]);

  // 🔄 auto-búsqueda mientras se escribe (debounce)
  useEffect(() => {
    if (!autoOnType) return;
    const query = q.trim();

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (!query) {
      setItems([]);
      setCount(0);
      setTotalResults(0);
      setLastQuery("");
      setPage(1);
      return;
    }

    debounceRef.current = setTimeout(() => {
      doSearch(query, 1);
    }, 600);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, autoOnType]);

  // Helper genérico: qué hacer cuando se elige un ítem
  const handleOpenItem = (item) => {
    if (onOpenResult) {
      onOpenResult(item); // 🧠 nuevo flujo: abrir lector/modal
      return;
    }
    if (onSelectItem) {
      onSelectItem(item); // compatibilidad hacia atrás
      return;
    }
    // Fallback: abrir link en otra pestaña
    const link = item.link || item.url;
    if (link) {
      window.open(link, "_blank", "noopener,noreferrer");
    }
  };

  /* ------------------------------ Render ------------------------------ */

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
            {total} resultado{total !== 1 ? "s" : ""} para{" "}
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

      {/* Estado: backend deshabilitado */}
      {disabledMsg && (
        <div className="mb-3 text-xs sm:text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          {disabledMsg}
        </div>
      )}

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
        <>
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
                item.snippet || item.resumen || item.description || "";
              const source =
                item.displayLink || item.fuente || item.host || "";

              const isPdf = /\.pdf(\?|$)/i.test(link || "");

              return (
                <article
                  key={`${item.link || item.url || idx}`}
                  className="border border-neutral-200 rounded-lg p-3 hover:border-amber-600/60 hover:shadow-sm transition-colors bg-white cursor-pointer"
                  onClick={() => handleOpenItem(item)} // 🔥 abre lector/modal
                >
                  <header className="mb-1">
                    <div
                      className={`${
                        variant === "compact"
                          ? "text-sm sm:text-[15px]"
                          : "text-sm sm:text-base"
                      } font-semibold text-amber-800 group-hover:text-amber-900`}
                    >
                      {title}
                    </div>
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

                  <div className="mt-2 flex flex-wrap gap-2 justify-between items-center">
                    {/* Leer aquí = abrir modal premium */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenItem(item);
                      }}
                      className="text-[11px] sm:text-xs font-semibold px-3 py-1.5 rounded-full border border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100 transition"
                    >
                      Leer aquí con BúhoLex
                    </button>

                    <div className="flex items-center gap-2 ml-auto">
                      {/* Botón específico para PDFs */}
                      {isPdf && (
                        <a
                          href={link}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="text-[11px] sm:text-xs font-semibold px-3 py-1.5 rounded-full border border-amber-400 bg-amber-100 text-amber-900 hover:bg-amber-200 transition"
                        >
                          Abrir archivo PDF
                        </a>
                      )}

                      {/* Link general a la página de origen */}
                      {link && !isPdf && (
                        <a
                          href={link}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="text-[11px] text-neutral-500 hover:text-neutral-700 underline underline-offset-2"
                        >
                          Ver sitio oficial
                        </a>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          {/* Paginación */}
          <div className="mt-3 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] sm:text-xs text-neutral-500">
            <span>
              Mostrando{" "}
              {from}-{to} de {total} resultado{total !== 1 ? "s" : ""}.
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={!canPrev || loading}
                onClick={() => doSearch(lastQuery, page - 1)}
                className={`px-3 py-1.5 rounded-full border text-[11px] sm:text-xs ${
                  !canPrev || loading
                    ? "border-neutral-200 text-neutral-300 cursor-not-allowed"
                    : "border-neutral-300 text-neutral-700 hover:bg-neutral-100"
                }`}
              >
                ← Anterior
              </button>
              <button
                type="button"
                disabled={!canNext || loading}
                onClick={() => doSearch(lastQuery, page + 1)}
                className={`px-3 py-1.5 rounded-full border text-[11px] sm:text-xs ${
                  !canNext || loading
                    ? "border-neutral-200 text-neutral-300 cursor-not-allowed"
                    : "border-neutral-300 text-neutral-700 hover:bg-neutral-100"
                }`}
              >
                Más resultados →
              </button>
            </div>
          </div>
        </>
      )}

      {/* Estado inicial */}
      {!touched && !hasResults && !loading && !error && !disabledMsg && (
        <div className="text-xs sm:text-sm text-neutral-500 mt-2">
          Ingresa un criterio de búsqueda para consultar en el motor
          de jurisprudencia.
        </div>
      )}
    </div>
  );
}
