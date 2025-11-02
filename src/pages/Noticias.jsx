// src/pages/Noticias.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { getNoticiasRobust, getEspecialidades } from "@/services/noticiasClientService";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";

const ESPECIALIDADES_DEFAULT = [
  { key: "todas", count: 0 },
  { key: "civil", count: 0 },
  { key: "penal", count: 0 },
  { key: "laboral", count: 0 },
  { key: "administrativo", count: 0 },
  { key: "constitucional", count: 0 },
];

const LANGS = [
  { key: "all", label: "Todos" },
  { key: "es", label: "Español" },
  { key: "en", label: "Inglés" },
];

export default function NoticiasPage() {
  const [tipo, setTipo] = useState("general");               // general | juridica
  const [especialidad, setEspecialidad] = useState("todas"); // sólo aplica a juridica
  const [lang, setLang] = useState("all");
  const [q, setQ] = useState("");
  const [qInput, setQInput] = useState("");

  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, limit: 12, total: 0, pages: 0, nextPage: null });
  const [loading, setLoading] = useState(false);

  const [chips, setChips] = useState(ESPECIALIDADES_DEFAULT);
  const listRef = useRef(null);

  const title = useMemo(() => (tipo === "juridica" ? "Noticias jurídicas" : "Noticias"), [tipo]);

  async function cargarChips() {
    try {
      if (tipo === "general") {
        setChips(ESPECIALIDADES_DEFAULT);
        return;
      }
      const data = await getEspecialidades({ tipo, lang });
      const arr = Array.isArray(data) && data.length ? [{ key: "todas", count: 0 }, ...data] : ESPECIALIDADES_DEFAULT;
      setChips(arr);
    } catch {
      setChips(ESPECIALIDADES_DEFAULT);
    }
  }

  async function cargar(pageToLoad = 1) {
    setLoading(true);
    try {
      const { items: arr, pagination: pag } = await getNoticiasRobust({
        tipo,
        page: pageToLoad,
        limit: 12,
        q,
        lang,
        especialidad,
      });
      setItems(arr);
      setPagination(pag);
      setPage(pag.page || pageToLoad);
      // focus top list
      try { listRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }); } catch {}
    } finally {
      setLoading(false);
    }
  }

  // Cargar chips al cambiar tipo/lang
  useEffect(() => { cargarChips(); }, [tipo, lang]);

  // Cargar noticias cuando cambian filtros
  useEffect(() => { cargar(1); }, [tipo, especialidad, lang, q]);

  const onBuscar = (e) => {
    e.preventDefault();
    setQ(qInput.trim());
  };

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-[#5C2E0B]">
      <h1 className="text-2xl sm:text-3xl font-extrabold mb-4">{title}</h1>

      {/* Filtros */}
      <div className="bg-white border rounded-2xl p-3 sm:p-4 shadow-sm mb-5">
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-sm">Tipo:</label>
          {["general", "juridica"].map((t) => (
            <button
              key={t}
              onClick={() => { setTipo(t); setEspecialidad("todas"); }}
              className={`px-3 py-1 rounded-full border text-sm ${tipo === t ? "bg-red-600 text-white border-red-600" : "hover:bg-gray-100"}`}
            >
              {t}
            </button>
          ))}

          <div className="mx-2 hidden sm:block h-5 w-px bg-gray-200" />

          <label className="text-sm">Idioma:</label>
          {LANGS.map((l) => (
            <button
              key={l.key}
              onClick={() => setLang(l.key)}
              className={`px-3 py-1 rounded-full border text-sm ${lang === l.key ? "bg-red-600 text-white border-red-600" : "hover:bg-gray-100"}`}
            >
              {l.label}
            </button>
          ))}

          <div className="ml-auto w-full sm:w-auto">
            <form onSubmit={onBuscar} className="flex gap-2 mt-2 sm:mt-0">
              <input
                value={qInput}
                onChange={(e) => setQInput(e.target.value)}
                placeholder="Buscar..."
                className="flex-1 sm:w-64 px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-red-500"
              />
              <button className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-500">Buscar</button>
            </form>
          </div>
        </div>

        {/* Chips de especialidad (sólo cuando es jurídica) */}
        {tipo === "juridica" && (
          <div className="mt-3 flex flex-wrap gap-2">
            {chips.map((c) => (
              <button
                key={c.key}
                onClick={() => setEspecialidad(c.key)}
                className={`text-xs px-3 py-1 rounded-full border ${especialidad === c.key ? "bg-gray-900 text-white border-gray-900" : "hover:bg-gray-100"}`}
                title={c.count ? `${c.count} notas` : "Especialidad"}
              >
                {c.key}{typeof c.count === "number" ? ` (${c.count})` : ""}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Lista */}
      <div ref={listRef} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading && items.length === 0 && (
          <div className="col-span-full flex items-center justify-center py-10 text-gray-500">
            <Loader2 className="animate-spin mr-2" /> Cargando…
          </div>
        )}

        {!loading && items.length === 0 && (
          <div className="col-span-full text-center text-gray-500 py-10">
            No hay resultados.
          </div>
        )}

        {items.map((n, idx) => (
          <article key={n.id || n.enlace || idx} className="border rounded-xl overflow-hidden bg-white hover:shadow-lg transition">
            {n.imagen && (
              <div className="h-44 w-full overflow-hidden">
                <img src={n.imagen} alt={n.titulo} className="w-full h-full object-cover" />
              </div>
            )}
            <div className="p-4">
              <div className="flex items-center text-xs text-gray-500 gap-2 mb-1">
                {n.fuente && <span className="px-2 py-0.5 border rounded-full">{n.fuente}</span>}
                {n.especialidad && <span className="px-2 py-0.5 border rounded-full">{n.especialidad}</span>}
                {n.fecha && <span>{new Date(n.fecha).toLocaleDateString("es-PE")}</span>}
              </div>
              <a href={n.enlace} target="_blank" rel="noopener noreferrer" className="font-bold text-lg hover:underline">
                {n.titulo}
              </a>
              {n.resumen && <p className="text-sm text-gray-700 mt-2 line-clamp-3">{n.resumen}</p>}
            </div>
          </article>
        ))}
      </div>

      {/* Paginación */}
      {pagination.pages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-2">
          <button
            onClick={() => cargar(Math.max(1, page - 1))}
            disabled={loading || page <= 1}
            className="px-3 py-2 border rounded-lg disabled:opacity-50 flex items-center gap-1"
          >
            <ChevronLeft size={18} /> Anterior
          </button>
          <span className="text-sm">
            Página {page} de {pagination.pages || 1}
          </span>
          <button
            onClick={() => cargar(Math.min((pagination.pages || page), page + 1))}
            disabled={loading || page >= (pagination.pages || page)}
            className="px-3 py-2 border rounded-lg disabled:opacity-50 flex items-center gap-1"
          >
            Siguiente <ChevronRight size={18} />
          </button>
        </div>
      )}
    </section>
  );
}
