import React, { useState, useEffect, useRef } from "react";
import { Megaphone } from "lucide-react";

/**
 * endpoint:
 *  - "general"   -> /api/noticias            (o VITE_NEWS_API_URL)
 *  - "juridicas" -> /api/noticias-juridicas  (o VITE_NEWS_LEGAL_API_URL)
 */
export default function NoticiasBotonFlotante({ endpoint = "general", titulo = "Noticias" }) {
  const BASE_URL =
    endpoint === "juridicas"
      ? (import.meta.env.VITE_NEWS_LEGAL_API_URL || "/api/noticias-juridicas")
      : (import.meta.env.VITE_NEWS_API_URL || "/api/noticias");

  const PAGE_SIZE = 8;

  const [isClient, setIsClient] = useState(false); // <-- evita hydration mismatch
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);   // Noticias acumuladas (con dedupe)
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [hayNuevas, setHayNuevas] = useState(false);

  const sidebarRef = useRef(null);

  // ---------- Detectar render en cliente ----------
  useEffect(() => {
    setIsClient(true);
  }, []);

  // ---------- Utils ----------
  const pick = (obj, keys) => {
    for (const k of keys) {
      if (obj?.[k]) return obj[k];
    }
    return undefined;
  };

  const normalizeResponse = (data) => {
    if (!data) return { items: [], hasMore: false };
    if (Array.isArray(data.noticias)) return { items: data.noticias, hasMore: Boolean(data.hasMore) };
    if (Array.isArray(data.items)) return { items: data.items, hasMore: Boolean(data.hasMore) };
    if (Array.isArray(data)) return { items: data, hasMore: false };
    return { items: [], hasMore: false };
  };

  // ---------- Data fetch ----------
  const fetchPage = async (p = 1) => {
    if (loading) return;
    setLoading(true);
    setErrorMsg("");

    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 15000);

    try {
      const url = `${BASE_URL}?page=${p}&limit=${PAGE_SIZE}`;
      const res = await fetch(url, { signal: ctrl.signal });

      const ct = res.headers.get("content-type") || "";
      if (!res.ok || !/json/i.test(ct)) {
        throw new Error(`Respuesta no válida (${res.status}) de ${url}`);
      }

      const data = normalizeResponse(await res.json());

      const keyFor = (n, idx) =>
        pick(n, ["enlace", "link", "url"]) ||
        pick(n, ["id", "_id"]) ||
        pick(n, ["id", "_id"]) ||
        `noticia-${idx}`;

      const next = new Map(items.map((n) => [keyFor(n), n]));
      for (const n of data.items) next.set(keyFor(n), n);

      setItems(Array.from(next.values()));
      setHasMore(data.hasMore);
      setPage(p);

      if (p === 1) setHayNuevas(true);
    } catch (err) {
      if (err?.name !== "AbortError") {
        console.error(`❌ Error cargando noticias (${endpoint}):`, err?.message || err);
        setErrorMsg("No se pudieron cargar las noticias. Intenta de nuevo.");
        setHasMore(false);
      }
    } finally {
      clearTimeout(t);
      setLoading(false);
    }
  };

  // Reinicia y carga cuando cambia endpoint (solo en cliente)
  useEffect(() => {
    if (!isClient) return;
    setItems([]);
    setPage(1);
    setHasMore(true);
    setErrorMsg("");
    fetchPage(1);
  }, [endpoint, isClient]);

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

  // Bloquea scroll del body + Escape para cerrar
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

  // ---------- UI ----------
  if (!isClient) {
    // Render estático estable para Vercel → evita mismatch
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
              {endpoint === "juridicas" ? "Noticias jurídicas" : "Noticias generales"}
            </h2>
            <button onClick={() => setOpen(false)} className="text-2xl font-bold hover:text-[#b03a1a]">&times;</button>
          </header>

          <div className="p-3 overflow-y-auto flex-1" ref={sidebarRef} style={{ scrollbarWidth: "thin" }}>
            {errorMsg && (
              <div className="mb-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded p-3">
                {errorMsg}
              </div>
            )}

            {items?.length > 0 ? (
              items.map((n, idx) => {
                const href = pick(n, ["enlace", "link", "url"]) || "#";
                const title = pick(n, ["titulo", "title", "headline"]) || "Sin título";
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
            {!hasMore && !loading && items.length > 0 && (
              <p className="text-center text-xs text-[#bbb] py-2">No hay más noticias.</p>
            )}
          </div>
        </aside>
      )}

      {/* Animaciones */}
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
