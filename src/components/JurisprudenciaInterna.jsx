/* eslint-disable react-hooks/exhaustive-deps */
// ============================================================
// 🦉 BúhoLex | Repositorio Interno de Jurisprudencia
// - Filtros clásicos + búsqueda semántica (embeddings)
// - Integra botón para consultar a LitisBot con la sentencia
// ============================================================

import React, {
  useCallback,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  buscarJurisprudenciaInterna,
  buscarJurisprudenciaEmbed,
} from "@/services/jurisInternaService";

import JurisprudenciaVisorModal from "@/components/jurisprudencia/JurisprudenciaVisorModal";
import JurisprudenciaCard from "@/components/jurisprudencia/JurisprudenciaCard";


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

export default function JurisprudenciaInterna({ onPreguntarConJuris }) {
  /* ------------------------------ state base ------------------------------ */
  const [filters, setFilters] = useState({
    palabraClave: "",
    materia: "",
    organo: "",
    estado: "",
    tag: "todas",
  });

  const [resultados, setResultados] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [seleccionada, setSeleccionada] = useState(null);

  // AbortController para no cruzar fetch
  const abortRef = useRef(null);

  const hayTexto = useMemo(
    () => filters.palabraClave.trim().length >= 3,
    [filters.palabraClave]
  );

  /* ------------------------------ handlers UI ----------------------------- */

  const handleChangeInput = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const handleChangeTag = (tagId) => {
    setFilters((prev) => ({ ...prev, tag: tagId }));
  };

  const handleLimpiar = () => {
    // Resetea filtros pero deja los resultados para que el usuario decida
    setFilters({
      palabraClave: "",
      materia: "",
      organo: "",
      estado: "",
      tag: "todas",
    });
  };

  const handleAbrirModal = (item) => {
    setSeleccionada(item || null);
    setModalOpen(true);
  };

  const handleCerrarModal = () => {
    setModalOpen(false);
    setSeleccionada(null);
  };

  /* --------------------------- fetch de resultados ------------------------ */

  const handleBuscar = useCallback(async () => {
    // Cancela petición previa
    if (abortRef.current) {
      abortRef.current.abort();
    }
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    setLoading(true);
    setErrorMsg("");

    const texto = filters.palabraClave.trim();

    try {
      let data = [];

      if (hayTexto) {
        // 🤖 Búsqueda semántica (embeddings)
        const res = await buscarJurisprudenciaEmbed({
          q: texto,
          limit: 20,
          signal: ctrl.signal,
        });

        if (res.ok) data = res.items || [];
      } else {
        // 🎯 Búsqueda clásica por filtros
        const res = await buscarJurisprudenciaInterna({
          materia: filters.materia || undefined,
          organo: filters.organo || undefined,
          estado: filters.estado || undefined,
          tag: filters.tag || "todas",
          signal: ctrl.signal,
        });

        if (res.ok) data = res.items || [];
      }

      setResultados(data);
    } catch (err) {
      if (err.name === "AbortError") return;
      console.error("[JurisInterna] Error búsqueda:", err);
      setErrorMsg(
        "Ocurrió un problema al consultar el repositorio interno. Inténtalo nuevamente."
      );
      setResultados([]);
    } finally {
      if (!ctrl.signal.aborted) {
        setLoading(false);
      }
    }
  }, [filters, hayTexto]);

  /* ------------------------------- render --------------------------------- */

  return (
    <main className="bg-[#f7f5f3] min-h-screen pb-16">
      <section className="max-w-6xl mx-auto px-4 pt-10">
        <header className="mb-6">
          <h1 className="text-3xl font-semibold text-brown-800 mb-2">
            Repositorio interno de jurisprudencia
          </h1>
          <p className="text-sm text-gray-600 max-w-3xl">
            Filtra las resoluciones almacenadas en tu propia base de datos:
            materia, órgano, estado, destacadas, etc. Esta capa será la base
            para que LitisBot consulte tu propio banco de sentencias.
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
              placeholder="Ejemplo: 'casación 702-2019 Cusco', 'ocupación precaria', 'daño moral'..."
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#8C3A0E]/70 focus:border-[#8C3A0E]"
            />
            {hayTexto && (
              <p className="mt-1 text-[11px] text-emerald-600">
                Se usará búsqueda inteligente (IA) sobre tu repositorio interno.
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

          {/* Botones */}
          <div className="flex gap-3 md:justify-end md:col-span-4">
            <button
              type="button"
              onClick={handleBuscar}
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

        {/* Estado vacío / error */}
        {errorMsg && (
          <div className="mb-4 rounded-md bg-red-50 px-4 py-3 text-sm text-red-700 border border-red-100">
            {errorMsg}
          </div>
        )}

        {!loading && !errorMsg && resultados.length === 0 && (
          <p className="text-sm text-gray-500">
            No hay resultados para los filtros actuales. Ingresa un criterio de
            búsqueda o ajusta los filtros.
          </p>
        )}

              {/* Lista de resultados */}
      {resultados.length > 0 && (
        <div className="mt-4 space-y-3">
          <p className="text-xs text-gray-500">
            {resultados.length} resolución
            {resultados.length !== 1 ? "es encontradas" : " encontrada"}.
          </p>

          <div className="grid gap-3 md:grid-cols-2">
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

              const tituloMostrar =
                titulo ||
                numero ||
                numeroExpediente ||
                "Resolución sin título";

              const fechaMostrar = fechaResolucion
                ? new Date(fechaResolucion).toLocaleDateString("es-PE")
                : null;

              return (
                <article
                  key={_id}
                  className="flex flex-col rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm hover:shadow-md transition cursor-pointer"
                  onClick={() => handleAbrirModal(item)}
                >
                  {/* chips superiores */}
                  <div className="mb-1 flex flex-wrap items-center gap-2 text-[11px]">
                    {materia && (
                      <span className="rounded-full bg-[#fdf4ec] px-2 py-0.5 font-medium text-[#8C3A0E]">
                        {materia}
                      </span>
                    )}

                    {organo && (
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-gray-700">
                        {organo}
                      </span>
                    )}

                    {estado && (
                      <span
                        className={`rounded-full px-2 py-0.5 ${
                          estado === "Vigente"
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {estado}
                      </span>
                    )}

                    {typeof score === "number" && (
                      <span className="ml-auto rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] text-indigo-700">
                        score {score.toFixed(3)}
                      </span>
                    )}
                  </div>

                  {/* título */}
                  <h3 className="mb-1 line-clamp-2 text-sm font-semibold text-brown-800">
                    {tituloMostrar}
                  </h3>

                  {/* sumilla / resumen */}
                  {sumilla && (
                    <p className="text-xs text-gray-700 line-clamp-3">
                      {sumilla}
                    </p>
                  )}

                  {!sumilla && resumen && (
                    <p className="text-xs text-gray-700 line-clamp-3">
                      {resumen}
                    </p>
                  )}

                  {/* pie con número y fecha */}
                  <div className="mt-2 flex items-center justify-between text-[11px] text-gray-500">
                    <span>
                      {numero && (
                        <>
                          Casación {numero}
                          {" · "}
                        </>
                      )}
                      {fechaMostrar}
                    </span>
                    <span className="font-medium text-[#8C3A0E]">
                      Ver detalle →
                    </span>
                  </div>

                  {/* 🦉 Botón para LitisBot (no abre el modal) */}
                  <button
                    type="button"
                    title="Enviar esta sentencia a LitisBot para analizarla"
                    onClick={(event) => {
                      // Evita que el click abra el modal de detalle
                      event.stopPropagation();

                      if (typeof onPreguntarConJuris === "function") {
                        onPreguntarConJuris(item);
                      }
                    }}
                    className="mt-2 inline-flex items-center gap-1 self-start rounded-full border border-[#8C3A0E]/40 bg-[#fdf4ec] px-3 py-1 text-[11px] font-semibold text-[#8C3A0E] hover:bg-[#fbe8d6] transition"
                  >
                    <span aria-hidden="true">🦉</span>
                    <span>Preguntar a LitisBot con esta sentencia</span>
                  </button>
                </article>
              );
            })}
          </div>
        </div>
      )}
    </section>

      {/* Modal de lectura / visor */}
      <JurisprudenciaVisorModal
        open={modalOpen}
        onClose={handleCerrarModal}
        doc={seleccionada}
      />
    </main>
  );
}
