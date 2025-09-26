import React, { useState, useEffect, useRef } from "react";
import { Megaphone } from "lucide-react";

// Endpoint → noticias generales (no jurídicas)
const BASE_URL =
  import.meta.env.VITE_NEWS_API_URL || "/api/noticias";

const NOTICIAS_POR_PAGINA = 8;

export default function NoticiasBotonFlotante() {
  const [open, setOpen] = useState(false);
  const [noticias, setNoticias] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [hayNuevas, setHayNuevas] = useState(false);
  const sidebarRef = useRef();

  // Normaliza la respuesta del backend (array o {items, hasMore})
  const normalizeResponse = (data) => {
    if (!data) return { items: [], hasMore: false };
    if (Array.isArray(data)) return { items: data, hasMore: false };
    if (Array.isArray(data.items)) {
      return { items: data.items, hasMore: Boolean(data.hasMore) };
    }
    return { items: [], hasMore: false };
  };

  const fetchNoticias = async (nextPage = 1, replace = false) => {
    if (loading) return;
    setLoading(true);

    const controller = new AbortController();
    try {
      const res = await fetch(BASE_URL, { signal: controller.signal });
      if (!res.ok) throw new Error(`Error HTTP ${res.status}`);

      const data = normalizeResponse(await res.json());

      // Evitar duplicados usando enlace o título como clave
      const uniques = Array.from(
        new Map(
          data.items.map((n) => [n.enlace || n.titulo || n.id, n])
        ).values()
      );

      const limitados = uniques.slice(0, nextPage * NOTICIAS_POR_PAGINA);
      setNoticias(replace ? limitados : limitados);
      setHasMore(data.hasMore || uniques.length > limitados.length);

      if (nextPage === 1) setHayNuevas(true);
    } catch (err) {
      if (err.name !== "AbortError") {
        console.error("❌ Error cargando noticias generales:", err);
        setHasMore(false);
      }
    } finally {
      setLoading(false);
    }

    return () => controller.abort();
  };

  // Cargar inicial
  useEffect(() => {
    fetchNoticias(1, true);
  }, []);

  // Scroll infinito en el sidebar
  useEffect(() => {
    if (!open) return;
    const el = sidebarRef.current;
    if (!el) return;

    const handleScroll = () => {
      if (
        el.scrollTop + el.clientHeight >= el.scrollHeight - 32 &&
        hasMore &&
        !loading
      ) {
        const next = page + 1;
        fetchNoticias(next);
        setPage(next);
      }
    };

    el.addEventListener("scroll", handleScroll);
    return () => el.removeEventListener("scroll", handleScroll);
  }, [open, hasMore, loading, page]);

  return (
    <>
      {/* Botón flotante */}
      <div
        className="
          fixed z-[100] bottom-4 left-1/2 transform -translate-x-1/2
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
          <span className="hidden sm:inline">Noticias</span>
          {hayNuevas && (
            <span className="absolute top-1 right-1 h-3 w-3 rounded-full bg-yellow-400 animate-ping"></span>
          )}
        </button>
      </div>

      {/* Sidebar */}
      {open && (
        <div
          className="fixed top-0 right-0 h-full w-full max-w-sm bg-white shadow-2xl border-l-4 border-[#b03a1a] z-[100] flex flex-col animate-slide-in"
          style={{ maxWidth: "340px" }}
        >
          <div className="flex items-center justify-between px-4 py-3 border-b bg-[#b03a1a]/10">
            <h2 className="font-bold text-[#b03a1a] text-lg">
              Noticias generales
            </h2>
            <button
              onClick={() => setOpen(false)}
              className="text-2xl font-bold hover:text-[#b03a1a]"
            >
              &times;
            </button>
          </div>
          <div
            className="p-3 overflow-y-auto flex-1"
            ref={sidebarRef}
            style={{ scrollbarWidth: "thin" }}
          >
            {noticias?.length > 0 ? (
              noticias.map((n, idx) => (
                <div key={n.enlace || n.titulo || idx} className="mb-3">
                  <div className="bg-[#fff6f3] rounded-xl p-3 shadow-md border hover:shadow-lg transition">
                    <div className="flex items-center mb-2">
                      {n.fuente && (
                        <span className="text-xs bg-[#b03a1a]/80 text-white px-2 py-0.5 rounded-full font-medium mr-2">
                          {n.fuente}
                        </span>
                      )}
                      <span className="ml-auto text-[11px] text-[#b03a1a] opacity-70">
                        {n.fecha &&
                          new Date(n.fecha).toLocaleDateString("es-PE")}
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
                      <p className="mt-1 text-sm text-[#3a2a20] opacity-85 line-clamp-3">
                        {n.resumen}
                      </p>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center text-gray-500">
                No hay noticias disponibles.
              </div>
            )}
            {loading && (
              <div className="text-center text-[#b03a1a] py-3">
                Cargando...
              </div>
            )}
            {!hasMore && !loading && noticias.length > 0 && (
              <div className="text-center text-xs text-[#bbb] py-2">
                No hay más noticias.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Animaciones */}
      <style>
        {`
        .animate-slide-in {
          animation: slideInRight 0.3s ease-out;
        }
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        .animate-bell {
          animation: bell-shake 1s infinite;
        }
        @keyframes bell-shake {
          0%, 100% { transform: rotate(0deg); }
          15% { transform: rotate(-20deg); }
          30% { transform: rotate(15deg); }
          45% { transform: rotate(-10deg); }
          60% { transform: rotate(10deg); }
          75% { transform: rotate(-5deg); }
        }
        `}
      </style>
    </>
  );
}
