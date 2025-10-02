import React, { useState, useEffect, useRef } from "react";
import { Megaphone } from "lucide-react";

export default function NoticiasBotonFlotante({ tipo = "generales", titulo = "Noticias" }) {
  const PAGE_SIZE = 8;
  const API_BASE = import.meta.env.VITE_API_BASE_URL || "/api";

  const [isClient, setIsClient] = useState(false);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [hayNuevas, setHayNuevas] = useState(false);

  const sidebarRef = useRef(null);

  useEffect(() => { setIsClient(true); }, []);

  // Generador de keys
  const keyFor = (n, idx) =>
    n?.url || n?.enlace || n?.link || n?.id || n?._id || `noticia-${idx}`;

  // Cargar noticias
  const fetchPage = async (p = 1) => {
    if (loading) return;
    setLoading(true);
    setErrorMsg("");

    try {
      const res = await fetch(`${API_BASE}/noticias?tipo=${tipo}&page=${p}&limit=${PAGE_SIZE}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      setItems((prev) => {
        const next = new Map((prev || []).map((n, i) => [keyFor(n, i), n]));
        for (const n of (data.items || [])) {
          next.set(keyFor(n), n);
        }
        return Array.from(next.values());
      });

      setHasMore(data.hasMore);
      setPage(p);
      if (p === 1) setHayNuevas(true);
    } catch (err) {
      console.error(`❌ Error cargando noticias (${tipo}):`, err);
      setErrorMsg("No se pudieron cargar las noticias. Intenta de nuevo.");
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  };

  // Carga inicial al montar
  useEffect(() => {
    if (!isClient) return;
    setItems([]);
    setPage(1);
    setHasMore(true);
    setErrorMsg("");
    fetchPage(1);
  }, [tipo, isClient]);

  // Scroll infinito
  useEffect(() => {
    if (!open) return;
    const el = sidebarRef.current;
    if (!el) return;
    const onScroll = () => {
      const nearBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 32;
      if (nearBottom && hasMore && !loading) fetchPage(page + 1);
    };
    el.addEventListener("scroll", onScroll);
    return () => el.removeEventListener("scroll", onScroll);
  }, [open, hasMore, loading, page]);

  // Control overflow y tecla ESC
  useEffect(() => {
    if (!isClient) return;
    const cls = "overflow-hidden";
    if (open) document.body.classList.add(cls);
    else document.body.classList.remove(cls);
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.classList.remove(cls);
      window.removeEventListener("keydown", onKey);
    };
  }, [open, isClient]);

  if (!isClient) {
    return (
      <div className="fixed bottom-4 right-4 z-[100]">
        <button
          className="px-4 py-2 rounded-full bg-[#b03a1a] text-white shadow-md"
          aria-label={titulo}
          disabled
        >
          <Megaphone size={20} />
        </button>
      </div>
    );
  }

  return (
    <>
      {/* Botón flotante */}
      <div
        className="fixed z-[100] bottom-4 left-1/2 -translate-x-1/2
                   md:left-auto md:right-8 md:bottom-8 md:translate-x-0
                   flex justify-center w-full md:w-auto pointer-events-none"
      >
        <button
          onClick={() => { setOpen(true); setHayNuevas(false); }}
          className="pointer-events-auto flex items-center gap-2 px-5 py-3
                     rounded-full shadow-2xl bg-[#b03a1a] text-white font-bold text-lg
                     hover:bg-[#a87247] transition active:scale-95 relative"
        >
          <Megaphone size={22} className={`text-white ${hayNuevas ? "animate-bell" : ""}`} />
          <span className="hidden sm:inline">{titulo}</span>
          {hayNuevas && <span className="absolute top-1 right-1 h-3 w-3 rounded-full bg-yellow-400 animate-ping" />}
        </button>
      </div>

      {/* Panel noticias */}
      {open && (
        <aside
          className="fixed top-0 right-0 h-full w-full max-w-[420px]
                     bg-white shadow-2xl border-l-4 border-[#b03a1a] z-[100]
                     flex flex-col animate-slide-in"
        >
          <header className="flex items-center justify-between px-4 py-3 border-b bg-[#b03a1a]/10">
            <h2 className="font-bold text-[#b03a1a] text-lg">
              {tipo === "juridicas" ? "Noticias jurídicas" : "Noticias generales"}
            </h2>
            <button onClick={() => setOpen(false)} className="text-2xl font-bold hover:text-[#b03a1a]">&times;</button>
          </header>

          <div className="p-3 overflow-y-auto flex-1" ref={sidebarRef} style={{ scrollbarWidth: "thin" }}>
            {errorMsg && (
              <div className="mb-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded p-3">
                {errorMsg}
              </div>
            )}

            {(items || []).length > 0 ? (
              (items || []).map((n, idx) => {
                const href = n?.url || n?.enlace || n?.link || "#";
                const title = n?.titulo || n?.title || n?.headline || "Sin título";
                return (
                  <article key={keyFor(n, idx)} className="mb-3">
                    <a href={href} target="_blank" rel="noopener noreferrer"
                      className="block font-bold text-[#b03a1a] hover:underline">
                      {title}
                    </a>
                  </article>
                );
              })
            ) : (
              !loading && !errorMsg && <p className="text-center text-gray-500">No hay noticias disponibles.</p>
            )}

            {loading && <p className="text-center text-[#b03a1a] py-3">Cargando…</p>}
            {!hasMore && !loading && (items || []).length > 0 && (
              <p className="text-center text-xs text-[#bbb] py-2">No hay más noticias.</p>
            )}
          </div>
        </aside>
      )}

      <style>{`
        .animate-slide-in { animation: slideInRight .28s ease-out; }
        @keyframes slideInRight { from { transform: translateX(100%) } to { transform: translateX(0) } }
        .animate-bell { animation: bell-shake 1s infinite; transform-origin: 50% 0; }
        @keyframes bell-shake {
          0%,100% { transform: rotate(0) }
          15% { transform: rotate(-18deg) }
          30% { transform: rotate(14deg) }
          45% { transform: rotate(-10deg) }
          60% { transform: rotate(9deg) }
          75% { transform: rotate(-4deg) }
        }
      `}</style>
    </>
  );
}
