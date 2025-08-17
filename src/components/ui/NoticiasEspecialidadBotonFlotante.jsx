import React, { useState, useEffect, useRef } from "react";
import { Megaphone } from "lucide-react";

const PROXY = "https://buholex-news-proxy-production.up.railway.app/api/noticias-juridicas"; // Cambia a tu endpoint cloud si está desplegado

export default function NoticiasEspecialidadBotonFlotante({ especialidad = "penal" }) {
  const [open, setOpen] = useState(false);
  const [noticias, setNoticias] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [hayNuevas, setHayNuevas] = useState(false);
  const sidebarRef = useRef();

  // Construye la query según especialidad
  const QUERY = encodeURIComponent(`${especialidad}+derecho+site:.pe`);

  const fetchNoticias = async (nextPage = 1) => {
    setLoading(true);
    try {
      const response = await fetch('https://buholex-news-proxy-production.up.railway.app/api/noticias-juridicas?q=penal+derecho+site:.pe');
      const items = await response.json();
      console.log(items);
      const nuevas = items.slice(0, nextPage * 8);
      setNoticias(nuevas);
      setHasMore(items.length > nuevas.length);
    } catch (err) {
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNoticias(1);
    setHayNuevas(true);
    // eslint-disable-next-line
  }, [especialidad]);

  useEffect(() => {
    if (!open) return;
    const el = sidebarRef.current;
    if (!el) return;
    const handleScroll = () => {
      if (el.scrollTop + el.clientHeight >= el.scrollHeight - 32 && hasMore && !loading) {
        fetchNoticias(page + 1);
        setPage((p) => p + 1);
      }
    };
    el.addEventListener("scroll", handleScroll);
    return () => el.removeEventListener("scroll", handleScroll);
    // eslint-disable-next-line
  }, [open, hasMore, loading, page]);

  const handleOpen = () => {
    setOpen(true);
    setHayNuevas(false);
  };

  return (
    <>
      {/* Botón flotante */}
      <div
        className="
          fixed z-[100] bottom-4 left-1/2 transform -translate-x-1/2
          md:left-auto md:right-8 md:bottom-8 md:translate-x-0
          flex justify-center w-full md:w-auto pointer-events-none
        "
        style={{ maxWidth: "100vw" }}
      >
        <button
          onClick={handleOpen}
          className="
            pointer-events-auto flex items-center gap-2 px-5 py-3
            rounded-full shadow-2xl
            bg-[#b03a1a] text-white font-bold text-lg
            hover:bg-[#a87247] transition active:scale-95
            relative
          "
          aria-label="Abrir noticias"
        >
          <Megaphone size={22} className={`text-white ${hayNuevas ? "animate-bell" : ""}`} />
          <span className="hidden sm:inline">Noticias {especialidad}</span>
          {hayNuevas && <span className="absolute top-1 right-1 h-3 w-3 rounded-full bg-yellow-400 animate-ping"></span>}
        </button>
      </div>
      {/* Sidebar premium */}
      {open && (
        <div className="fixed top-0 right-0 h-full w-full max-w-sm bg-white shadow-2xl border-l-4 border-[#b03a1a] z-[100] flex flex-col animate-slide-in"
          style={{ maxWidth: "340px" }}>
          <div className="flex items-center justify-between px-4 py-3 border-b bg-[#b03a1a]/10">
            <h2 className="font-bold text-[#b03a1a] text-lg">Noticias {especialidad}</h2>
            <button onClick={() => setOpen(false)} className="text-2xl font-bold hover:text-[#b03a1a]">&times;</button>
          </div>
          <div className="p-3 overflow-y-auto flex-1" ref={sidebarRef}
            style={{ scrollbarWidth: "thin", scrollbarColor: "#b03a1a #f7e4d5" }}>
            {noticias?.length > 0 ? (
              noticias.map((n, idx) => (
                <div key={idx} className="mb-3">
                  <div className="bg-[#f7f4ef] rounded-xl p-3 shadow-md border border-[#e8d3c3] hover:shadow-lg transition">
                    <div className="flex items-center mb-2">
                      <span className="text-xs bg-[#b03a1a]/80 text-white px-2 py-0.5 rounded-full font-medium mr-2">
                        {n.fuente}
                      </span>
                      <span className="ml-auto text-[11px] text-[#b03a1a] opacity-70">
                        {n.fecha && new Date(n.fecha).toLocaleDateString()}
                      </span>
                    </div>
                    <a
                      href={n.enlace}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block font-bold text-[#b03a1a] text-[15px] leading-snug hover:underline hover:text-[#a87247] transition"
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
            {loading && <div className="text-center text-[#b03a1a] py-3">Cargando...</div>}
            {!hasMore && !loading && (
              <div className="text-center text-xs text-[#bbb] py-2">No hay más noticias.</div>
            )}
          </div>
        </div>
      )}
      {/* Animaciones y scroll personalizado */}
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
        .overflow-y-auto::-webkit-scrollbar {
          width: 7px;
        }
        .overflow-y-auto::-webkit-scrollbar-thumb {
          background: #b03a1a;
          border-radius: 6px;
        }
        .overflow-y-auto::-webkit-scrollbar-track {
          background: #f7e4d5;
        }
        `}
      </style>
    </>
  );
}
