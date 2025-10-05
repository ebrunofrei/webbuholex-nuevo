// ============================================================
// 🦉 BÚHOLEX | Noticias Jurídicas Inteligentes
// ============================================================
// UI/UX original (el que te mostraba cards) + mejoras puntuales:
//  - Normalizador universal (soporta {ok,items}, {data}, array puro)
//  - Fetch con AbortController y compatibilidad de params
//  - Manejo de especialidad "todas" (no manda el query si es "todas")
//  - Fallback de imágenes y modal lector
// ============================================================

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNoticiasGuardadas } from "@/oficinaVirtual/hooks/useNoticiasGuardadas";
import { asAbsoluteUrl } from "@/utils/apiUrl";

// === CONFIG API ===
const API_BASE =
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_URL ||
  "http://localhost:3000/api";

const PAGE_SIZE = 12;

// === ESPECIALIDADES ===
const AREAS = [
  "todas",
  "penal",
  "civil",
  "laboral",
  "constitucional",
  "familiar",
  "administrativo",
];
const AREAS_LABEL = {
  todas: "Todas",
  penal: "Penal",
  civil: "Civil",
  laboral: "Laboral",
  constitucional: "Constitucional",
  familiar: "Familiar",
  administrativo: "Administrativo",
};
const OTRAS = [
  "comercial",
  "tributario",
  "procesal",
  "registral",
  "ambiental",
  "notarial",
  "penitenciario",
  "consumidor",
  "seguridad social",
];
const AFINES = [
  "jurisprudencia",
  "doctrina",
  "procesal",
  "reformas",
  "precedente",
  "casación",
  "tribunal constitucional",
];

// === MEDIOS ===
const FALLBACK_IMG = "/assets/default-news.jpg";

// --- Normalizador universal (para backend unificado y APIs antiguas) ---
const normalize = (data) => {
  if (!data) return [];
  const arr = Array.isArray(data)
    ? data
    : Array.isArray(data.items)
    ? data.items
    : Array.isArray(data.result)
    ? data.result
    : [];

  return arr.map((n, i) => ({
    id: n._id || n.id || i,
    titulo: n.titulo || n.title || "Sin título",
    resumen: n.resumen || n.description || n.extracto || "Sin resumen disponible.",
    contenido: n.contenido || n.content || n.texto || n.body || "",
    imagen: n.imagen || n.image || n.imageUrl || FALLBACK_IMG,
    enlace: n.enlace || n.url || "",
    fuente: n.fuente || n.source || "Fuente desconocida",
    fecha: n.fecha || n.date || n.publishedAt || n.createdAt || null,
    especialidad: n.especialidad || n.area || "general",
    tipo: n.tipo || "general",
  }));
};

export default function NoticiasOficina() {
  const { guardadas /*, guardarNoticia, quitarNoticia*/ } = useNoticiasGuardadas();

  // === Filtros ===
  const [tipo, setTipo] = useState("juridica");
  const [especialidad, setEspecialidad] = useState("todas");
  const [tema, setTema] = useState("");
  const [mostrarOtras, setMostrarOtras] = useState(false);
  const [q, setQ] = useState("");

  // === Datos ===
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);

  const abortRef = useRef(null);

  // === Modal lector ===
  const [open, setOpen] = useState(false);
  const [sel, setSel] = useState(null);
  const shellRef = useRef(null);

  // --- Fetch con compatibilidad total ---
  async function fetchNoticias(reset = false) {
    try {
      if (loading) return;
      setLoading(true);

      if (abortRef.current) abortRef.current.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      const next = reset ? 1 : page;

      // Solo añadimos parámetros que realmente tienen valor
      const params = new URLSearchParams();
      if (tipo) params.set("tipo", tipo);
      if (especialidad && especialidad !== "todas") params.set("especialidad", especialidad);
      if (tema) params.set("tema", tema);
      params.set("page", String(next));
      params.set("limit", String(PAGE_SIZE));

      const url = `${API_BASE}/noticias?${params.toString()}`;
      const res = await fetch(url, { signal: controller.signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const json = await res.json();
      if (import.meta.env.MODE !== "production") {
        console.log("🧠 Datos API:", json);
      }

      // Compatibilidad asegurada
      const data = json?.items || json?.data || json || [];
      const nuevos = normalize(data);

      setItems((prev) => (reset ? nuevos : [...prev, ...nuevos]));
      setPage(next + 1);
      setHasMore(nuevos.length === PAGE_SIZE);
    } catch (e) {
      if (e.name !== "AbortError") console.error("❌ Error noticias:", e);
    } finally {
      setLoading(false);
    }
  }

  // === Reload al cambiar filtros ===
  useEffect(() => {
    setItems([]);
    setPage(1);
    setHasMore(true);
    fetchNoticias(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tipo, especialidad, tema]);

  // === Filtro local (buscador) ===
  const filtradas = useMemo(() => {
    const text = q.trim().toLowerCase();
    if (!text) return items;
    return items.filter(
      (n) =>
        n.titulo.toLowerCase().includes(text) ||
        (n.resumen || "").toLowerCase().includes(text) ||
        (n.fuente || "").toLowerCase().includes(text)
    );
  }, [items, q]);

  const savedSet = useMemo(
    () => new Set((guardadas || []).map((x) => x?._id || x?.id).filter(Boolean)),
    [guardadas]
  );

  // === Helpers ===
  const mediaSrc = (url) => {
    if (!url) return FALLBACK_IMG;
    // Si ya es local, úsala
    if (/^\/(assets|uploads)\//.test(url)) return url;
    // HTTP directo; si 403, cae al onError
    if (/^https?:\/\//i.test(url)) return url;
    return FALLBACK_IMG;
  };

  // === Modal ===
  const openReader = (n) => {
    setSel(n);
    setOpen(true);
    shellRef.current?.classList.add("overflow-hidden");
  };
  const closeReader = () => {
    setOpen(false);
    setSel(null);
    shellRef.current?.classList.remove("overflow-hidden");
  };

  // === RENDER ===
  return (
    <div
      ref={shellRef}
      className="relative h-[calc(100vh-80px)] bg-[#fffaf6] rounded-2xl border border-[#f1e5dc] shadow-[0_6px_32px_-10px_rgba(176,58,26,0.08)] overflow-hidden"
    >
      <div className="grid grid-rows-[auto,1fr] h-full">
        {/* HEADER */}
        <header className="sticky top-0 z-10 bg-[#fff6ef]/95 backdrop-blur px-4 sm:px-6 pt-6 pb-3 border-b border-[#f1e5dc]">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-center text-[#b03a1a]">
            Noticias Jurídicas Inteligentes
          </h2>

          {/* Tipo de noticias */}
          <div className="mt-3 flex flex-wrap justify-center gap-2">
            {[
              { key: "juridica", label: "Jurídicas" },
              { key: "general", label: "Generales" },
            ].map((t) => (
              <button
                key={t.key}
                onClick={() => setTipo(t.key)}
                className={`px-4 py-2 rounded-full font-semibold transition ${
                  tipo === t.key
                    ? "bg-[#b03a1a] text-white"
                    : "bg-white text-[#b03a1a] border border-[#e7d4c8]"
                }`}
              >
                {t.label}
              </button>
            ))}
            <button
              onClick={() => setMostrarOtras((v) => !v)}
              className="px-4 py-2 rounded-full font-semibold bg-white text-[#b03a1a] border border-[#e7d4c8]"
            >
              {mostrarOtras ? "Ocultar especialidades" : "Otras especialidades"}
            </button>
          </div>

          {/* Especialidades principales */}
          <div className="mt-3 flex flex-wrap justify-center gap-2">
            {AREAS.map((a) => (
              <button
                key={a}
                onClick={() => setEspecialidad(a)}
                className={`px-3 py-1.5 rounded-full border text-sm font-semibold transition ${
                  especialidad === a
                    ? "bg-[#b03a1a] text-white"
                    : "text-[#4a2e23] border-[#e7d4c8] bg-white"
                }`}
              >
                {AREAS_LABEL[a]}
              </button>
            ))}
          </div>

          {/* Otras especialidades */}
          {mostrarOtras && (
            <div className="mt-2 flex flex-wrap justify-center gap-2">
              {OTRAS.map((o) => (
                <button
                  key={o}
                  onClick={() => setEspecialidad(o)}
                  className={`px-3 py-1.5 rounded-full border text-sm font-semibold transition ${
                    especialidad === o
                      ? "bg-[#b03a1a] text-white"
                      : "text-[#4a2e23] border-[#e7d4c8] bg-white"
                  }`}
                >
                  {o[0].toUpperCase() + o.slice(1)}
                </button>
              ))}
            </div>
          )}

          {/* Temas afines */}
          <div className="mt-3 flex flex-wrap justify-center gap-2">
            <span className="text-sm font-semibold text-[#4a2e23] mr-1">
              Temas afines:
            </span>
            {AFINES.map((t) => (
              <button
                key={t}
                onClick={() => setTema(t)}
                className={`px-3 py-1.5 rounded-full border text-sm font-semibold transition ${
                  tema === t
                    ? "bg-[#b03a1a] text-white"
                    : "text-[#4a2e23] border-[#e7d4c8] bg-white"
                }`}
              >
                {t[0].toUpperCase() + t.slice(1)}
              </button>
            ))}
            {tema && (
              <button
                onClick={() => setTema("")}
                className="px-3 py-1.5 rounded-full text-sm font-semibold text-[#b03a1a] bg-white border border-[#e7d4c8]"
              >
                Limpiar tema
              </button>
            )}
          </div>

          {/* Buscador */}
          <div className="mt-4 max-w-2xl mx-auto">
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar en los resultados..."
              className="w-full px-4 py-2 rounded-xl border border-[#e7d4c8] outline-none bg-white"
            />
          </div>
        </header>

        {/* LISTADO */}
        <section className="overflow-y-auto px-4 sm:px-6 py-6 no-scrollbar">
          {loading && items.length === 0 ? (
            <p className="text-center text-gray-500">Cargando noticias…</p>
          ) : filtradas.length === 0 ? (
            <p className="text-center text-[#b03a1a] font-semibold">
              No hay noticias en esta especialidad.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
              {filtradas.map((n) => (
                <article
                  key={n.id}
                  className="rounded-xl bg-white border border-[#f1e5dc] shadow-sm hover:shadow-md overflow-hidden cursor-pointer transition-all"
                  onClick={() => openReader(n)}
                >
                  {/* Imagen */}
                  <div className="relative aspect-[16/9] bg-[#f6f2ee]">
                    <img
                      src={mediaSrc(n.imagen)}
                      alt={n.titulo}
                      className="w-full h-full object-cover"
                      onError={(e) => (e.currentTarget.src = FALLBACK_IMG)}
                      loading="lazy"
                    />
                    <div className="absolute inset-x-0 bottom-0 bg-black/55 text-white px-3 py-2 text-sm line-clamp-2">
                      {n.titulo}
                    </div>
                  </div>

                  {/* Contenido */}
                  <div className="p-3">
                    <p className="text-sm text-[#6b4d3e] line-clamp-5">
                      {n.resumen}
                    </p>
                    <div className="mt-3 flex justify-between text-xs text-[#8a6e60]">
                      <span>{n.fuente}</span>
                      {n.fecha && (
                        <time>{new Date(n.fecha).toLocaleDateString()}</time>
                      )}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}

          {/* Cargar más */}
          {hasMore && (
            <div className="mt-8 flex justify-center">
              <button
                disabled={loading}
                onClick={() => fetchNoticias(false)}
                className="px-5 py-2 rounded-lg bg-[#b03a1a] text-white font-semibold disabled:opacity-60 hover:bg-[#a87247]"
              >
                {loading ? "Cargando…" : "Cargar más"}
              </button>
            </div>
          )}
        </section>
      </div>

      {/* MODAL LECTOR */}
      {open && sel && (
        <div
          className="fixed inset-0 z-40 bg-black/70 flex items-center justify-center p-3"
          role="dialog"
          aria-modal="true"
          onClick={closeReader}
        >
          <div
            className="w-full max-w-5xl max-h-[90vh] bg-white rounded-2xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header modal */}
            <div className="sticky top-0 bg-[#b03a1a] text-white px-4 sm:px-6 py-3 flex items-start gap-3">
              <h3 className="text-base sm:text-lg font-bold leading-snug">
                {sel.titulo}
              </h3>
              <button
                onClick={closeReader}
                className="ml-auto text-white text-xl font-bold leading-none"
                aria-label="Cerrar"
              >
                ×
              </button>
            </div>

            {/* Body con scroll */}
            <div className="overflow-y-auto max-h-[calc(90vh-56px)]">
              {sel.imagen && (
                <img
                  src={mediaSrc(sel.imagen)}
                  alt={sel.titulo}
                  className="w-full object-contain max-h-[60vh] bg-[#f6f2ee]"
                  onError={(e) => (e.currentTarget.src = FALLBACK_IMG)}
                />
              )}

              <div className="px-4 sm:px-6 py-4">
                <div className="text-sm text-[#6b4d3e] flex flex-wrap gap-3 mb-4">
                  {sel.fuente && (
                    <span>
                      Fuente:{" "}
                      <span className="font-semibold">{sel.fuente}</span>
                    </span>
                  )}
                  {sel.fecha && (
                    <span>{new Date(sel.fecha).toLocaleString()}</span>
                  )}
                </div>

                <div className="prose max-w-none text-[#3a2a24]">
                  {sel.contenido ? (
                    <div dangerouslySetInnerHTML={{ __html: sel.contenido }} />
                  ) : (
                    <p className="whitespace-pre-line">{sel.resumen}</p>
                  )}
                </div>

                <div className="mt-6 flex gap-3">
                  {sel.enlace && /^https?:\/\//.test(sel.enlace) && (
                    <a
                      href={sel.enlace}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-[#b03a1a] text-white px-4 py-2 rounded-lg font-semibold hover:bg-[#a87247]"
                    >
                      Ver en fuente
                    </a>
                  )}
                  <button
                    onClick={closeReader}
                    className="px-4 py-2 rounded-lg border font-semibold text-[#8a6e60]"
                  >
                    Cerrar
                  </button>
                </div>

                <p className="mt-4 text-xs text-[#8a6e60]">
                  Publicado y adaptado por el equipo jurídico de{" "}
                  <strong>BúhoLex</strong>.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* util: oculta/estiliza scrollbar (opcional) */}
      <style>{`
        .no-scrollbar::-webkit-scrollbar { width: 8px; height: 8px; }
        .no-scrollbar::-webkit-scrollbar-thumb { background: #e6d9cf; border-radius: 8px; }
        .no-scrollbar::-webkit-scrollbar-track { background: transparent; }
      `}</style>
    </div>
  );
}
