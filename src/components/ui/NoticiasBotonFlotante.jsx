import React, { useState, useEffect, useRef } from "react";
import { Megaphone } from "lucide-react";

/**
 * endpoint:
 *  - "general"  -> /api/noticias  (o VITE_NEWS_API_URL)
 *  - "juridicas"-> /api/noticias-juridicas (o VITE_NEWS_LEGAL_API_URL)
 */
export default function NoticiasBotonFlotante({ endpoint = "general", titulo = "Noticias" }) {
  const BASE_URL =
    endpoint === "juridicas"
      ? (import.meta.env.VITE_NEWS_LEGAL_API_URL || "/api/noticias-juridicas")
      : (import.meta.env.VITE_NEWS_API_URL || "/api/noticias");

  const PAGE_SIZE = 8;

  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);        // noticias acumuladas (dedupe)
  const [page, setPage] = useState(1);           // página actual cargada
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [hayNuevas, setHayNuevas] = useState(false);
  const sidebarRef = useRef(null);

  // Normaliza la respuesta del backend (array o {items, hasMore})
  const normalizeResponse = (data) => {
    if (!data) return { items: [], hasMore: false };
    if (Array.isArray(data)) return { items: data, hasMore: false };
    if (Array.isArray(data.items)) {
      return { items: data.items, hasMore: Boolean(data.hasMore) };
    }
    return { items: [], hasMore: false };
  };

  // Llamada a API con paginación real
  const fetchPage = async (p = 1) => {
    if (loading) return;
    setLoading(true);
    try {
      const url = `${BASE_URL}?page=${p}&limit=${PAGE_SIZE}`;
      const res = await fetch(url);

      // Evita intentar parsear HTML cuando algo del routing falla
      const ct = res.headers.get("content-type") || "";
      if (!res.ok || !/json/i.test(ct)) {
        throw new Error(`Respuesta no válida (${res.status}) de ${url}`);
      }

      const data = normalizeResponse(await res.json());

      // Dedupe global (por enlace/título/id)
      const next = new Map(items.map(n => [n.enlace || n.titulo || n.id, n]));
      for (const n of data.items) {
        next.set(n.enlace || n.titulo || n.id, n);
      }

      setItems(Array.from(next.values()));
      setHasMore(data.hasMore);
      setPage(p);

      if (p === 1) setHayNuevas(true);
    } catch (err) {
      console.error(`❌ Error cargando noticias (${endpoint}):`, err);
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  };

  // Carga inicial
  useEffect(() => {
    // al cambiar endpoint reiniciamos estado
    setItems([]);
    setPage(1);
    setHasMore(true);
    fetchPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endpoint]);

  // Scroll infinito dentro del panel
  useEffect(() => {
    if (!open) return;
    const el = sidebarRef.current;
    if (!el) return;

    const onScroll = () => {
      const nearBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 32;
      if (nearBottom && hasMore && !loading) {
        fetchPage(page + 1);
      }
    };

    el.addEventListener("scroll", onScroll);
    return () => el.removeEventListener("scroll", onScroll);
  }, [open, hasMore, loading, page]);

  // Bloquea el scroll de body cuando abre
  useEffect(() => {
    const cls = "overflow-hidden";
    if (open) document.body.classList.add(cls);
    else document.body.classList.remove(cls);
    return () => document.body.classList.remove(cls);
  }, [open]);

  // Ping simple cada 5 min para marcar "hay nuevas" (solo cuando está cerrado)
  useEffect(() => {
    const id = setInterval(async () => {
      if (open) return;
      try {
        const res = await fetch(`${BASE_URL}?page=1&limit=1`, { method: "GET" });
        const ct = res.headers.get("content-type") || "";
        if (!/json/i.test(ct)) return;
        const data = normalizeResponse(await res.json());
        const firstNew = data.items?.[0]?.enlace || data.items?.[0]?.titulo || data.items?.[0]?.id;
        const firstOld = items?.[0]?.enlace || items?.[0]?.titulo || items?.[0]?.id;
        if (firstNew && firstNew !== firstOld) setHayNuevas(true);
      } catch {}
    }, 5 * 60 * 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, BASE_URL, items]);

  return (
    <>
      {/* Botón flotante */}
      <div
        className="
          fixed z-[100] bottom-4 left-1/2 -translate-x-1/2
          md:left-auto md:right-8 md:bottom-8 md:translate-x-0
          flex justify-center w-full md:w-auto pointer-events-none
        "
      >
        <button
          onClick={() => {
            setOpen(true);
            setHayNuevas(false);
          }}
          className="
            pointer-events-auto flex items-center gap-2 px-5 py-3
            rounded-full shadow-2xl
            bg-[#b03a1a] text-white font-bold text-lg
            hover:bg-[#a87247] transition active:scale-95
            relative
          "
        >
          <Megaphone
            size={22}
            className={`text-white ${hayNuevas ? "animate-bell" : ""}`}
          />
          <span className="hidden sm:inline">{titulo}</span>
          {hayNuevas && (
            <span className="absolute top-1 right-1 h-3 w-3 rounded-full bg-yellow-400 animate-ping"></span>
          )}
        </button>
      </div>

      {/* Panel / Sidebar */}
      {open && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed top-0 right-0 h-full w-full max-w-sm bg-white shadow-2xl border-l-4 border-[#b03a1a] z-[100] flex flex-col animate-slide-in"
          style={{ maxWidth: "340px" }}
        >
          <div className="flex items-center justify-between px-4 py-3 border-b bg-[#b03a1a]/10">
            <h2 className="font-bold text-[#b03a1a] text-lg">
              {endpoint === "juridicas" ? "Noticias jurídicas" : "Noticias generales"}
            </h2>
            <button
              onClick={() => setOpen(false)}
              className="text-2xl font-bold hover:text-[#b03a1a]"
              aria-label="Cerrar noticias"
            >
              &times;
            </button>
          </div>

          <div
            className="p-3 overflow-y-auto flex-1"
            ref={sidebarRef}
            style={{ scrollbarWidth: "thin" }}
          >
            {items?.length > 0 ? (
              items.map((n, idx) => (
                <div key={n.enlace || n.titulo || n.id || idx} className="mb-3">
                  <div className="bg-[#fff6f3] rounded-xl p-3 shadow-md border hover:shadow-lg transition">
                    <div className="flex items-center mb-2">
                      {n.fuente && (
                        <span className="text-xs bg-[#b03a1a]/80 text-white px-2 py-0.5 rounded-full font-medium mr-2">
                          {n.fuente}
                        </span>
                      )}
                      <span className="ml-auto text-[11px] text-[#b03a1a] opacity-70">
                        {n.fecha && new Date(n.fecha).toLocaleDateString("es-PE")}
                      </span>
                    </div>
                    <a
                      href={n.enlace}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block font-bold text-[#b03a1a] text-[15px] leading-snug hover:underline hover:text-[#a87247] transition"
                    >
                      {n.titulo || "Sin título"}
                    </a>
                    {n.resumen && (
                      <p className="mt-1 text-sm text-[#3a2a20] opacity-85"
                         style={{
                           display: "-webkit-box",
                           WebkitBoxOrient: "vertical",
                           WebkitLineClamp: 3,
                           overflow: "hidden"
                         }}>
                        {n.resumen}
                      </p>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center text-gray-500">No hay noticias disponibles.</div>
            )}

            {loading && (
              <div className="text-center text-[#b03a1a] py-3">Cargando…</div>
            )}
            {!hasMore && !loading && items.length > 0 && (
              <div className="text-center text-xs text-[#bbb] py-2">No hay más noticias.</div>
            )}
          </div>
        </div>
      )}

      {/* Animaciones */}
      <style>
        {`
        .animate-slide-in { animation: slideInRight .28s ease-out; }
        @keyframes slideInRight { from { transform: translateX(100%) } to { transform: translateX(0) } }
        .animate-bell { animation: bell-shake 1s infinite; }
        @keyframes bell-shake {
          0%,100% { transform: rotate(0) }
          15% { transform: rotate(-18deg) }
          30% { transform: rotate(14deg) }
          45% { transform: rotate(-10deg) }
          60% { transform: rotate(9deg) }
          75% { transform: rotate(-4deg) }
        }
        `}
      </style>
    </>
  );
}
