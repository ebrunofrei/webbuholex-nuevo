/* eslint-disable react-hooks/exhaustive-deps */
// ============================================================
// 🦉 BúhoLex | Repositorio Interno de Jurisprudencia (v2 PRO - Fase A)
// - Lista con filtros + paginación real
// - Modal se maneja desde la página Jurisprudencia.jsx
// - Integrado con búsqueda clásica + embeddings
// ============================================================

import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  buscarJurisprudenciaInterna,
  buscarJurisprudenciaEmbed,
} from "@/services/jurisInternaService";

const TAGS = [
  { id: "todas", label: "Todas" },
  { id: "recientes", label: "Recientes" },
  { id: "mas_citadas", label: "Más citadas" },
  { id: "destacadas", label: "Destacadas" },
];

const MATERIAS = [
  { id: "", label: "Todas las materias" },
  { id: "Civil", label: "Civil" },
  { id: "Penal", label: "Penal" },
  { id: "Constitucional", label: "Constitucional" },
  { id: "Laboral", label: "Laboral" },
  { id: "Administrativo", label: "Administrativo" },
];

const ORGANOS = [
  { id: "", label: "Todos los órganos" },
  { id: "Corte Suprema", label: "Corte Suprema" },
  { id: "Sala Superior", label: "Sala Superior" },
  { id: "Juzgado", label: "Juzgado" },
];

const ESTADOS = [
  { id: "", label: "Todos los estados" },
  { id: "Vigente", label: "Vigente" },
  { id: "No vigente", label: "No vigente" },
];

const PAGE_SIZE = 20;

// Skeleton simple para las cards mientras loading
function CardSkeleton() {
  return (
    <div className="flex flex-col h-full rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm animate-pulse">
      <div className="mb-2 flex flex-wrap gap-2">
        <div className="h-4 w-20 rounded-full bg-slate-200/80" />
        <div className="h-4 w-24 rounded-full bg-slate-200/70" />
      </div>
      <div className="mb-2 h-3 w-3/4 rounded-full bg-slate-200/80" />
      <div className="mb-1 h-3 w-full rounded-full bg-slate-200/70" />
      <div className="mb-1 h-3 w-5/6 rounded-full bg-slate-200/70" />
      <div className="mt-auto pt-3 flex items-center justify-between">
        <div className="h-3 w-24 rounded-full bg-slate-200/70" />
        <div className="h-3 w-16 rounded-full bg-slate-200/60" />
      </div>
    </div>
  );
}

// 🔹 onVer: abre el visor (lo maneja la página)
// 🔹 onPreguntarConJuris: envía la sentencia a LitisBot
export default function JurisprudenciaInterna({ onVer, onPreguntarConJuris }) {
  /* ------------------------------ state base ------------------------------ */
  const [filters, setFilters] = useState({
    palabraClave: "",
    materia: "",
    organo: "",
    estado: "",
    tag: "todas",
    anio: "",
  });

  const [resultados, setResultados] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // AbortController para no cruzar fetch
  const abortRef = useRef(null);

  const hayTexto = useMemo(
    () => filters.palabraClave.trim().length >= 3,
    [filters.palabraClave]
  );

  const from = totalCount > 0 ? (page - 1) * PAGE_SIZE + 1 : 0;
  const to =
    totalCount > 0 ? Math.min(from + resultados.length - 1, totalCount) : 0;

  const canPrev = page > 1;
  const canNext = page * PAGE_SIZE < totalCount;

  /* ------------------------------ handlers UI ----------------------------- */

  const handleChangeInput = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const handleChangeTag = (tagId) => {
    setFilters((prev) => ({ ...prev, tag: tagId }));
  };

  const handleLimpiar = () => {
    setFilters({
      palabraClave: "",
      materia: "",
      organo: "",
      estado: "",
      tag: "todas",
      anio: "",
    });
    setResultados([]);
    setTotalCount(0);
    setPage(1);
    setErrorMsg("");
  };

  /* --------------------------- fetch de resultados ------------------------ */

  const handleBuscar = useCallback(
    async (pageOverride = 1) => {
      // Cancelar petición anterior si sigue viva
      if (abortRef.current) {
        abortRef.current.abort();
      }
      const ctrl = new AbortController();
      abortRef.current = ctrl;

      setLoading(true);
      setErrorMsg("");

      const texto = filters.palabraClave.trim();
      const anio = filters.anio ? Number(filters.anio) : undefined;
      const pageToUse = pageOverride || 1;

      try {
        let items = [];
        let count = 0;

        if (hayTexto) {
          // 🤖 Búsqueda semántica (embeddings) sobre el repositorio interno
          const res = await buscarJurisprudenciaEmbed({
            q: texto,
            anio,
            page: pageToUse,
            limit: PAGE_SIZE,
            signal: ctrl.signal,
          });

          // Soportamos tanto shape {ok, items, count} como {items, count}
          const ok = res?.ok ?? true;
          if (!ok) {
            throw new Error(`Error búsqueda embed: ${res?.status || "desconocido"}`);
          }
          items = res.items || [];
          count = res.count ?? items.length;
        } else {
          // 🎯 Búsqueda clásica por filtros
          const res = await buscarJurisprudenciaInterna({
            materia: filters.materia || undefined,
            organo: filters.organo || undefined,
            estado: filters.estado || undefined,
            tag: filters.tag || "todas",
            anio,
            page: pageToUse,
            limit: PAGE_SIZE,
            signal: ctrl.signal,
          });

          const ok = res?.ok ?? true;
          if (!ok) {
            throw new Error(`Error búsqueda interna: ${res?.status || "desconocido"}`);
          }
          items = res.items || [];
          count = res.count ?? items.length;
        }

        setResultados(items);
        setTotalCount(count);
        setPage(pageToUse);
      } catch (err) {
        if (err.name === "AbortError") return;
        console.error("[JurisInterna] Error búsqueda:", err);
        setErrorMsg(
          "Ocurrió un problema al consultar el repositorio interno. Inténtalo nuevamente."
        );
        setResultados([]);
        setTotalCount(0);
      } finally {
        // limpiar ref y apagar loading salvo que se haya abortado después
        if (!ctrl.signal.aborted) {
          setLoading(false);
        }
        if (abortRef.current === ctrl) {
          abortRef.current = null;
        }
      }
    },
    [filters, hayTexto]
  );

  /* ------------------------------- render --------------------------------- */

  return (
    <section className="max-w-6xl mx-auto px-4 pb-16">
      <header className="mb-6">
        <h2 className="text-2xl font-semibold text-brown-800 mb-2">
          Repositorio interno de jurisprudencia
        </h2>
        <p className="text-sm text-gray-600 max-w-3xl">
          Aquí puedes filtrar las resoluciones jurisprudenciales del
          repositorio interno por materia, órgano, estado, año y criterios de
          relevancia. Cuando encuentres la que te interesa, haz clic en
          “Consultar con LitisBot” y luego abre el chat flotante (ícono en la
          parte inferior derecha). Escribe el motivo de tu consulta y envía el
          mensaje, LitisBot analizará automáticamente la sentencia usando el
          contexto que le indiques.
        </p>
      </header>

      {/* Chips de filtro rápido */}
      <div className="flex flex-wrap gap-2 mb-4">
        {TAGS.map((t) => {
          const active = filters.tag === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => handleChangeTag(t.id)}
              className={`px-3 py-1 rounded-full text-xs font-medium border ${
                active
                  ? "bg-[#8C3A0E] text-white border-[#8C3A0E]"
                  : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
              }`}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Filtros */}
      <div className="grid gap-4 md:grid-cols-4 items-end mb-6">
        <div className="md:col-span-2">
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Buscar por palabra clave
          </label>
          <input
            type="text"
            name="palabraClave"
            value={filters.palabraClave}
            onChange={handleChangeInput}
            placeholder="Ej.: 'ocupación precaria', 'daño moral', 'casación 702-2019 Cusco'..."
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#8C3A0E]/70 focus:border-[#8C3A0E]"
          />
          {hayTexto && (
            <p className="mt-1 text-[11px] text-emerald-600">
              Se usará búsqueda inteligente (IA) sobre el repositorio interno.
            </p>
          )}
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Materia
          </label>
          <select
            name="materia"
            value={filters.materia}
            onChange={handleChangeInput}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#8C3A0E]/70 focus:border-[#8C3A0E]"
          >
            {MATERIAS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3 md:col-span-2 md:grid-cols-2">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Órgano
            </label>
            <select
              name="organo"
              value={filters.organo}
              onChange={handleChangeInput}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#8C3A0E]/70 focus:border-[#8C3A0E]"
            >
              {ORGANOS.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Estado
            </label>
            <select
              name="estado"
              value={filters.estado}
              onChange={handleChangeInput}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#8C3A0E]/70 focus:border-[#8C3A0E]"
            >
              {ESTADOS.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Año de resolución */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Año de resolución
          </label>
          <input
            type="number"
            name="anio"
            value={filters.anio}
            onChange={handleChangeInput}
            placeholder="Todos"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#8C3A0E]/70 focus:border-[#8C3A0E]"
            min="1990"
            max={new Date().getFullYear()}
          />
        </div>

        {/* Botones */}
        <div className="flex gap-3 md:justify-end md:col-span-4">
          <button
            type="button"
            onClick={() => handleBuscar(1)}
            disabled={loading}
            className="inline-flex items-center justify-center rounded-md bg-[#8C3A0E] px-5 py-2 text-sm font-medium text-white shadow-sm hover:bg-[#72300c] disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? "Buscando..." : "Buscar"}
          </button>
          <button
            type="button"
            onClick={handleLimpiar}
            className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Limpiar
          </button>
        </div>
      </div>

      {/* Estado error */}
      {errorMsg && (
        <div className="mb-4 rounded-md bg-red-50 px-4 py-3 text-sm text-red-700 border border-red-100">
          {errorMsg}
        </div>
      )}

      {/* Estado vacío (solo cuando no está cargando y no hay error) */}
      {!loading && !errorMsg && resultados.length === 0 && totalCount === 0 && (
        <p className="text-sm text-gray-500">
          No hay resultados para los filtros actuales. Ingresa un criterio de
          búsqueda o ajusta los filtros.
        </p>
      )}

            {/* Lista de resultados / skeletons */}
      {loading && (
        <div className="mt-5 space-y-3">
          <p className="text-[11px] sm:text-xs text-slate-500">
            Buscando en el repositorio interno…
          </p>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, idx) => (
              <CardSkeleton key={idx} />
            ))}
          </div>
        </div>
      )}

      {!loading && resultados.length > 0 && (
        <div className="mt-5 space-y-3">
          {/* Resumen + explicación del tipo de ordenamiento */}
          <p className="text-[11px] sm:text-xs text-slate-500 leading-relaxed">
            Mostrando <span className="font-semibold">{from}</span>-
            <span className="font-semibold">{to}</span> de{" "}
            <span className="font-semibold">{totalCount}</span> resolución
            {totalCount !== 1 ? "es encontradas" : " encontrada"}.
            <span className="hidden sm:inline"> · </span>
            <span className="block sm:inline mt-0.5 sm:mt-0">
              {hayTexto
                ? "Ordenadas por relevancia (búsqueda inteligente con IA sobre el repositorio interno)."
                : "Ordenadas por fecha y filtros seleccionados del repositorio interno."}
            </span>
          </p>

          {/* GRID PRO */}
          <div className="mt-1 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {resultados.map((item) => {
              const {
                _id,
                materia,
                organo,
                estado,
                score,
                titulo,
                numero,
                numeroExpediente,
                sumilla,
                resumen,
                fechaResolucion,
              } = item;

              const key =
                _id || item.id || item.uuid || `${numeroExpediente}-${titulo}`;
              const tituloMostrar =
                titulo || numero || numeroExpediente || "Resolución sin título";

              const fechaMostrar = fechaResolucion
                ? new Date(fechaResolucion).toLocaleDateString("es-PE")
                : null;

              const fichaCompleta = Boolean(
                sumilla || resumen || item.pdfUrl || item.urlResolucion
              );

              return (
                <article
                  key={key}
                  onClick={() =>
                    typeof onVer === "function" && onVer(item)
                  }
                  className="
                    flex flex-col h-full cursor-pointer 
                    rounded-2xl border border-slate-200 bg-white 
                    px-4 py-3 
                    shadow-[0_10px_25px_rgba(15,23,42,0.06)]
                    hover:shadow-[0_18px_45px_rgba(15,23,42,0.12)]
                    hover:border-[#5C2E0B]/70
                    transition-all duration-200
                  "
                >
                  {/* CHIPS PRO */}
                  <div className="mb-2 flex flex-wrap items-center gap-2 text-[10px] sm:text-[11px]">
                    {/* Materia */}
                    {materia && (
                      <span className="inline-flex items-center rounded-full bg-[#5C2E0B] px-2.5 py-0.5 font-semibold text-white shadow-sm">
                        {materia}
                      </span>
                    )}

                    {/* Órgano */}
                    {organo && (
                      <span className="inline-flex items-center rounded-full border border-[#5C2E0B]/40 bg-white px-2.5 py-0.5 font-medium text-[#5C2E0B]">
                        {organo}
                      </span>
                    )}

                    {/* Estado */}
                    {estado && (
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 font-medium
                          ${
                            estado === "Vigente"
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-slate-100 text-slate-600"
                          }`}
                      >
                        {estado}
                      </span>
                    )}

                    {/* Ficha completa */}
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 font-medium 
                        ${
                          fichaCompleta
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-slate-50 text-slate-500"
                        }`}
                    >
                      {fichaCompleta ? "Ficha completa" : "Ficha parcial"}
                    </span>

                    {/* Score IA */}
                    {typeof score === "number" && (
                      <span className="ml-auto inline-flex items-center rounded-full bg-indigo-50 px-2.5 py-0.5 text-indigo-700 font-medium">
                        score {score.toFixed(3)}
                      </span>
                    )}
                  </div>

                  {/* TÍTULO */}
                  <h3 className="mb-1.5 line-clamp-2 text-sm font-semibold text-[#5C2E0B] leading-snug">
                    {tituloMostrar}
                  </h3>

                  {/* SUMILLA / RESUMEN */}
                  {sumilla && (
                    <p className="text-xs text-slate-700 leading-snug line-clamp-3">
                      {sumilla}
                    </p>
                  )}
                  {!sumilla && resumen && (
                    <p className="text-xs text-slate-700 leading-snug line-clamp-3">
                      {resumen}
                    </p>
                  )}

                  {/* PIE PRO */}
                  <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500">
                    <span>
                      {numeroExpediente && (
                        <>
                          Exp. {numeroExpediente}
                          {" · "}
                        </>
                      )}
                      {fechaMostrar}
                    </span>

                    <span className="font-medium text-[#5C2E0B]">
                      Ver detalle →
                    </span>
                  </div>

                  {/* BOTÓN IA */}
                  {typeof onPreguntarConJuris === "function" && (
                    <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onPreguntarConJuris(item);
                    }}
                    className="
                      mt-3 inline-flex items-center gap-2 self-start
                      rounded-full
                      bg-gradient-to-r from-[#5C2E0B] to-[#7a3a12]
                      px-3.5 py-1.5
                      text-[11px] font-semibold text-white
                      shadow-[0_6px_18px_rgba(92,46,11,0.35)]
                      hover:from-[#4a2308] hover:to-[#6b2f0f]
                      active:scale-[0.96]
                      transition
                    "
                  >
                    <span className="text-[12px]">🦉</span>
                    <span>Analizar con LitisBot</span>
                  </button>
                  )}
                </article>
              );
            })}
          </div>

          {/* Paginación PRO */}
          <div className="mt-5 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-slate-600">
            <span>
              Página {page} · Mostrando {from}-{to} de {totalCount}
            </span>

            <div className="flex gap-2">
              <button
                type="button"
                disabled={!canPrev || loading}
                onClick={() => handleBuscar(page - 1)}
                className={`px-3 py-1.5 rounded-full border ${
                  !canPrev || loading
                    ? "border-slate-200 text-slate-300 cursor-not-allowed"
                    : "border-slate-300 text-slate-700 hover:bg-slate-100"
                }`}
              >
                ← Anterior
              </button>

              <button
                type="button"
                disabled={!canNext || loading}
                onClick={() => handleBuscar(page + 1)}
                className={`px-3 py-1.5 rounded-full border ${
                  !canNext || loading
                    ? "border-slate-200 text-slate-300 cursor-not-allowed"
                    : "border-slate-300 text-slate-700 hover:bg-slate-100"
                }`}
              >
                Más resultados →
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
