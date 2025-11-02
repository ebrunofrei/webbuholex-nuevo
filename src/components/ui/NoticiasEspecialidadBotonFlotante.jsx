// src/components/ui/NoticiasEspecialidadBotonFlotante.jsx
/* ============================================================
 * 🦉 BúhoLex | Botón flotante — Noticias JURÍDICAS por especialidad
 * - Forzado a tipo="juridica"
 * - Filtra SOLO por "especialidad" (NO sirve para generales)
 * - Scroll infinito dentro del panel
 * - Cache ligera via getNoticiasRobust (sessionStorage)
 * ============================================================ */

import React, { useEffect, useRef, useState } from "react";
import { Scale, X } from "lucide-react";
import { getNoticiasRobust, clearNoticiasCache, API_BASE } from "@services/noticiasClientService";

const PAGE_SIZE = 8;

export default function NoticiasEspecialidadBotonFlotante({
  especialidad = "civil",   // penal | civil | laboral | ...
  lang = "all",             // es | en | all
  titulo = "Noticias jurídicas",
}) {
  const [open, setOpen] = useState(false);

  // listado
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);

  // indicador de nuevas
  const [hayNuevas, setHayNuevas] = useState(false);

  const boxRef = useRef(null);

  async function fetchNoticias(nextPage = 1) {
    if (loading) return;
    setLoading(true);
    try {
      const { items: data, pagination } = await getNoticiasRobust({
        // 🚫 No cambiar: este componente es SOLO JURÍDICAS
        tipo: "juridica",
        especialidad,            // ← filtro clave aquí
        lang,                    // "all" no filtra
        page: nextPage,
        limit: PAGE_SIZE,
      });

      // Merge sin duplicados por enlace|titulo
      const prev = nextPage === 1 ? [] : items;
      const map = new Map(prev.map((n) => [n.enlace || n.url || n.titulo, n]));
      (Array.isArray(data) ? data : []).forEach((n) => {
        map.set(n.enlace || n.url || n.titulo, n);
      });

      const list = Array.from(map.values());
      setItems(list);
      setPage(pagination?.page || nextPage);
      setHasMore(Boolean(pagination?.nextPage));
    } catch (err) {
      console.error("❌ Error cargando jurídicas:", err);
      
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  }

  // primera carga + cuando cambian filtros
  useEffect(() => {
    // reset paginación al cambiar props
    setItems([]);
    setPage(1);
    setHasMore(true);
    fetchNoticias(1);
    setHayNuevas(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [especialidad, lang]);

  // scroll infinito dentro del panel
  useEffect(() => {
    if (!open) return;
    const el = boxRef.current;
    if (!el) return;

    const onScroll = () => {
      if (loading || !hasMore) return;
      const nearBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 40;
      if (nearBottom) fetchNoticias(page + 1);
    };

    el.addEventListener("scroll", onScroll);
    return () => el.removeEventListener("scroll", onScroll);
  }, [open, page, hasMore, loading]);

  const handleOpen = () => {
    setOpen(true);
    setHayNuevas(false);
  };

  return (
    <>
      {/* Botón flotante */}
      <div
        className="fixed z-[80] bottom-24 left-1/2 -translate-x-1/2
                   md:left-auto md:right-6 md:bottom-24 md:translate-x-0
                   flex justify-center w-full md:w-auto pointer-events-none"
      >
        <button
          onClick={handleOpen}
          className="pointer-events-auto flex items-center gap-2 px-5 py-3
                     rounded-full shadow-2xl bg-[#6d4a28] text-white font-bold text-lg
                     hover:bg-[#52351e] transition active:scale-95 relative"
          title={`${titulo} — ${especialidad}`}
        >
          <Scale size={22} className={hayNuevas ? "animate-bell" : ""} />
          <span className="hidden sm:inline">Jurídicas</span>
          {hayNuevas && (
            <span className="absolute top-1 right-1 h-3 w-3 rounded-full bg-yellow-400 animate-ping" />
          )}
        </button>
      </div>

      {/* Panel lateral */}
      {open && (
        <div className="fixed inset-0 z-[90] flex">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <aside
            className="relative ml-auto w-full max-w-[360px] h-full bg-white shadow-2xl
                       border-l-4 border-[#6d4a28] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b bg-[#6d4a28]/10">
              <h2 className="font-bold text-[#6d4a28] text-lg">
                {titulo} — <span className="capitalize">{especialidad}</span>
              </h2>
              <button
                onClick={() => setOpen(false)}
                className="p-1 hover:opacity-70"
                title="Cerrar"
              >
                <X className="w-6 h-6 text-[#6d4a28]" />
              </button>
            </div>

            <div
              ref={boxRef}
              className="p-3 overflow-y-auto flex-1"
              style={{ scrollbarWidth: "thin", scrollbarColor: "#6d4a28 #f7e4d5" }}
            >
              {items.length === 0 && !loading && (
                <div className="text-center text-gray-500 py-6">Sin noticias.</div>
              )}

              {items.map((n, idx) => (
                <article key={n.enlace || n.url || idx} className="mb-3">
                  <div className="bg-[#faf9f6] rounded-xl p-3 shadow-md border border-[#e0d6c8] hover:shadow-lg transition">
                    <div className="flex items-center mb-2">
                      <span className="text-xs bg-[#6d4a28]/80 text-white px-2 py-0.5 rounded-full font-medium mr-2">
                        {n.fuente || "Fuente"}
                      </span>
                      <span className="ml-auto text-[11px] text-[#6d4a28] opacity-70">
                        {n.fecha ? new Date(n.fecha).toLocaleDateString("es-PE") : ""}
                      </span>
                    </div>

                    <a
                      href={n.enlace || n.url || "#"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block font-bold text-[#6d4a28] text-[15px] leading-snug hover:underline hover:text-[#52351e] transition"
                      style={{ wordBreak: "break-word" }}
                    >
                      {n.titulo}
                    </a>

                    {n.resumen && (
                      <p className="mt-1 text-sm text-[#3a2a20] opacity-85 line-clamp-3">
                        {n.resumen}
                      </p>
                    )}
                  </div>
                </article>
              ))}

              {loading && <div className="text-center text-[#6d4a28] py-3">Cargando…</div>}

              {!hasMore && items.length > 0 && (
                <div className="text-center text-xs text-[#bbb] py-2">No hay más noticias.</div>
              )}
            </div>
          </aside>
        </div>
      )}

      {/* Estilos locales (sin fugar a global) */}
      <style>{`
        .animate-bell { animation: bell-shake 1s infinite cubic-bezier(.36,.07,.19,.97); }
        @keyframes bell-shake {
          0%,100% { transform: rotate(0deg); }
          15% { transform: rotate(-20deg); }
          30% { transform: rotate(15deg); }
          45% { transform: rotate(-10deg); }
          60% { transform: rotate(10deg); }
          75% { transform: rotate(-5deg); }
          85% { transform: rotate(5deg); }
        }
      `}</style>
    </>
  );
}
