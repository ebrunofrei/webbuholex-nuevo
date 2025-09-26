import React, { useState, useEffect, useRef } from "react";
import { Scale } from "lucide-react";

const BASE_URL = "/api/noticias";

const NOTICIAS_POR_PAGINA = 8;

export default function NoticiasEspecialidadBotonFlotante() {
  const [open, setOpen] = useState(false);
  const [noticias, setNoticias] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [hayNuevas, setHayNuevas] = useState(false);
  const sidebarRef = useRef();

  const fetchNoticias = async (nextPage = 1) => {
    setLoading(true);
    const controller = new AbortController();
    try {
      const response = await fetch(BASE_URL, {
        method: "GET",
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`Error HTTP ${response.status}`);

      const items = await response.json();
      const uniques = Array.from(
        new Map(items.map((n) => [n.enlace || n.titulo, n])).values()
      );

      const nuevas = uniques.slice(0, nextPage * NOTICIAS_POR_PAGINA);
      setNoticias(nuevas);
      setHasMore(uniques.length > nuevas.length);
    } catch (err) {
      console.error("❌ Error cargando noticias jurídicas:", err);
      setHasMore(false);
    } finally {
      setLoading(false);
    }
    return () => controller.abort();
  };

  useEffect(() => {
    fetchNoticias(1);
    setHayNuevas(true);
  }, []);

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
        fetchNoticias(page + 1);
        setPage((p) => p + 1);
      }
    };
    el.addEventListener("scroll", handleScroll);
    return () => el.removeEventListener("scroll", handleScroll);
  }, [open, hasMore, loading, page]);

  const handleOpen = () => {
    setOpen(true);
    setHayNuevas(false);
  };

  return (
    <>
      {/* Botón flotante */}
      <div
        className="fixed z-[100] bottom-20 left-1/2 transform -translate-x-1/2
        md:left-auto md:right-8 md:bottom-20 md:translate-x-0
        flex justify-center w-full md:w-auto pointer-events-none"
      >
        <button
          onClick={handleOpen}
          className="pointer-events-auto flex items-center gap-2 px-5 py-3
          rounded-full shadow-2xl
          bg-[#6d4a28] text-white font-bold text-lg
          hover:bg-[#52351e] transition active:scale-95
          relative"
        >
          <Scale
            size={22}
            className={`text-white ${hayNuevas ? "animate-bell" : ""}`}
          />
          <span className="hidden sm:inline">Jurídicas</span>
          {hayNuevas && (
            <span className="absolute top-1 right-1 h-3 w-3 rounded-full bg-yellow-400 animate-ping"></span>
          )}
        </button>
      </div>

      {/* Sidebar */}
      {open && (
        <div
          className="fixed top-0 right-0 h-full w-full max-w-sm bg-white shadow-2xl border-l-4 border-[#6d4a28] z-[100] flex flex-col animate-slide-in"
          style={{ maxWidth: "340px" }}
        >
          <div className="flex items-center justify-between px-4 py-3 border-b bg-[#6d4a28]/10">
            <h2 className="font-bold text-[#6d4a28] text-lg">Noticias jurídicas</h2>
            <button
              onClick={() => setOpen(false)}
              className="text-2xl font-bold hover:text-[#6d4a28]"
            >
              &times;
            </button>
          </div>
          <div
            className="p-3 overflow-y-auto flex-1"
            ref={sidebarRef}
            style={{ scrollbarWidth: "thin", scrollbarColor: "#6d4a28 #f7e4d5" }}
          >
            {noticias?.length > 0 ? (
              noticias.map((n, idx) => (
                <div key={n.enlace || idx} className="mb-3">
                  <div className="bg-[#faf9f6] rounded-xl p-3 shadow-md border border-[#e0d6c8] hover:shadow-lg transition">
                    <div className="flex items-center mb-2">
                      <span className="text-xs bg-[#6d4a28]/80 text-white px-2 py-0.5 rounded-full font-medium mr-2">
                        {n.fuente}
                      </span>
                      <span className="ml-auto text-[11px] text-[#6d4a28] opacity-70">
                        {n.fecha && new Date(n.fecha).toLocaleDateString("es-PE")}
                      </span>
                    </div>
                    <a
                      href={n.enlace}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block font-bold text-[#6d4a28] text-[15px] leading-snug hover:underline hover:text-[#52351e] transition"
                      style={{ wordBreak: "break-word" }}
                    >
                      {n.titulo}
                    </a>
                    <p className="mt-1 text-sm text-[#3a2a20] opacity-85 line-clamp-3">
                      {n.resumen}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center text-gray-500">Sin noticias.</div>
            )}
            {loading && (
              <div className="text-center text-[#6d4a28] py-3">Cargando...</div>
            )}
            {!hasMore && !loading && (
              <div className="text-center text-xs text-[#bbb] py-2">
                No hay más noticias.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Estilos */}
      <style>
        {`
        .animate-slide-in {
          animation: slideInRight 0.3s cubic-bezier(.46,.03,.52,.96);
        }
        @keyframes slideInRight {
          0% { transform: translateX(100%);}
          100% { transform: translateX(0);}
        }
        .animate-bell {
          animation: bell-shake 1s infinite cubic-bezier(.36,.07,.19,.97);
        }
        @keyframes bell-shake {
          0%, 100% { transform: rotate(0deg);}
          15% { transform: rotate(-20deg);}
          30% { transform: rotate(15deg);}
          45% { transform: rotate(-10deg);}
          60% { transform: rotate(10deg);}
          75% { transform: rotate(-5deg);}
          85% { transform: rotate(5deg);}
        }
        `}
      </style>
    </>
  );
}
