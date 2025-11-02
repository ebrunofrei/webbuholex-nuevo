// src/pages/PruebaNoticias.jsx
import React, { useEffect, useState } from "react";
import { getNoticiasRobust, getEspecialidades, clearNoticiasCache } from "@/services/noticiasClientService";

const PROVIDERS = ["elpais", "elcomercio", "rpp", "reuters", "ap", "bbc", "cnn"];

export default function PruebaNoticias() {
  const [tipo, setTipo] = useState("general"); // "general" | "juridica"
  const [lang, setLang] = useState("all");     // "all" | "es" | "en"
  const [q, setQ] = useState("");              // texto libre (o "politics,política")
  const [especialidad, setEspecialidad] = useState("todas");
  const [providers, setProviders] = useState(["elpais","elcomercio","rpp"]); // sólo general

  const [page, setPage] = useState(1);
  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 12, total: 0, pages: 0 });
  const [loading, setLoading] = useState(false);
  const [especialidades, setEspecialidades] = useState([]);

  const load = async (p = 1) => {
    setLoading(true);
    try {
      const resp = await getNoticiasRobust({
        tipo,
        page: p,
        limit: 8,
        q,
        lang,
        especialidad: tipo === "juridica" ? especialidad : undefined,
        providers: tipo === "general" ? providers : undefined,
      });
      setPagination(resp.pagination);
      setItems(p === 1 ? resp.items : [...items, ...resp.items]);
      setPage(resp.pagination.page || p);
    } finally {
      setLoading(false);
    }
  };

  // cargar especialidades cuando sea "juridica"
  useEffect(() => {
    let ignore = false;
    (async () => {
      if (tipo !== "juridica") { setEspecialidades([]); return; }
      const chips = await getEspecialidades({ tipo: "juridica", lang: lang === "all" ? undefined : lang });
      if (!ignore) setEspecialidades([{ key: "todas", count: 0 }, ...chips]);
    })();
    return () => { ignore = true; };
  }, [tipo, lang]);

  // recargar al cambiar filtros base
  useEffect(() => {
    clearNoticiasCache();
    load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tipo, lang, q, especialidad, providers.join(",")]);

  const toggleProvider = (p) => {
    setProviders((prev) => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]);
  };

  return (
    <div className="p-4 max-w-5xl mx-auto space-y-4">
      <h1 className="text-2xl font-bold">Prueba Noticias</h1>

      <div className="flex flex-wrap gap-3 items-end">
        <div>
          <label className="text-xs block mb-1">Tipo</label>
          <select value={tipo} onChange={(e) => setTipo(e.target.value)} className="border px-2 py-1 rounded">
            <option value="general">general</option>
            <option value="juridica">juridica</option>
          </select>
        </div>

        <div>
          <label className="text-xs block mb-1">Idioma</label>
          <select value={lang} onChange={(e) => setLang(e.target.value)} className="border px-2 py-1 rounded">
            <option value="all">Todos</option>
            <option value="es">Español</option>
            <option value="en">Inglés</option>
          </select>
        </div>

        <div className="flex-1 min-w-[220px]">
          <label className="text-xs block mb-1">q / tema</label>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder='p.ej. "politics,política"'
            className="w-full border px-2 py-1 rounded"
          />
        </div>

        {tipo === "juridica" && (
          <div>
            <label className="text-xs block mb-1">Especialidad</label>
            <select
              value={especialidad}
              onChange={(e) => setEspecialidad(e.target.value)}
              className="border px-2 py-1 rounded"
            >
              {especialidades.map((x) => (
                <option key={x.key} value={x.key}>{x.key}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {tipo === "general" && (
        <div className="flex flex-wrap gap-2">
          <span className="text-xs text-gray-500 mr-1">Providers:</span>
          {PROVIDERS.map((p) => (
            <button
              key={p}
              onClick={() => toggleProvider(p)}
              className={`text-xs px-2 py-1 rounded border ${providers.includes(p) ? "bg-black text-white border-black" : "hover:bg-gray-100"}`}
            >
              {p}
            </button>
          ))}
        </div>
      )}

      <div className="text-sm text-gray-600">
        {loading ? "Cargando…" : `Resultados: ${items.length} / ${pagination.total} (página ${pagination.page} de ${pagination.pages || "?"})`}
      </div>

      <div className="grid md:grid-cols-2 gap-3">
        {items.map((n) => (
          <article key={n.id || n.enlace} className="border rounded-lg p-3">
            <div className="text-xs text-gray-500 mb-1">{n.fuente} · {n.lang} · {n.tipo}</div>
            <h3 className="font-semibold">{n.titulo}</h3>
            {n.imagen && <img src={n.imagen} alt="" className="w-full h-40 object-cover rounded mt-2" />}
            {n.resumen && <p className="text-sm mt-2 line-clamp-3">{n.resumen}</p>}
            {n.enlace && (
              <a href={n.enlace} target="_blank" rel="noreferrer" className="text-blue-700 underline text-sm mt-2 inline-block">
                Ver fuente
              </a>
            )}
          </article>
        ))}
      </div>

      {pagination.nextPage && (
        <button
          onClick={() => load(page + 1)}
          disabled={loading}
          className="px-4 py-2 border rounded hover:bg-gray-50"
        >
          Cargar más
        </button>
      )}
    </div>
  );
}
