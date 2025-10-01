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

  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);   // Noticias acumuladas (con dedupe)
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [hayNuevas, setHayNuevas] = useState(false);

  const sidebarRef = useRef(null);

  // ---------- Utils ----------
  const pick = (obj, keys) => {
    for (const k of keys) {
      if (obj?.[k]) return obj[k];
    }
    return undefined;
  };

  // Normaliza la respuesta del backend
  const normalizeResponse = (data) => {
    if (!data) return { items: [], hasMore: false };

    // /api/noticias -> { noticias, hasMore? }
    if (Array.isArray(data.noticias)) {
      return { items: data.noticias, hasMore: Boolean(data.hasMore) };
    }
    // Otros formatos -> { items, hasMore? }
    if (Array.isArray(data.items)) {
      return { items: data.items, hasMore: Boolean(data.hasMore) };
    }
    // Array simple
    if (Array.isArray(data)) {
      return { items: data, hasMore: false };
    }
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

      // Dedupe por enlace/título/id (tolerante a campos distintos)
      const keyFor = (n) =>
        pick(n, ["enlace", "link", "url"]) ||
        pick(n, ["id", "_id"]) ||
        pick(n, ["titulo", "title", "headline"]) ||
        Math.random().toString(36).slice(2);

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

  // Reinicia y carga cuando cambia endpoint
  useEffect(() => {
    setItems([]);
    setPage(1);
    setHasMore(true);
    setErrorMsg("");
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

  // Bloquea scroll del body + Escape para cerrar
  useEffect(() => {
    const cls = "overflow-hidden";
    if (open) document.body.classList.add(cls);
    else document.body.classList.remove(cls);
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.classList.remove(cls);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // Ping simple cada 5min para marcar indicador "hay nuevas" (cuando está cerrado)
  useEffect(() => {
    const id = setInterval(async () => {
      if (open) return;
      try {
        const res = await fetch(`${BASE_URL}?page=1&limit=1`);
        const ct = res.headers.get("content-type") || "";
        if (!/json/i.test(ct)) return;
        const data = normalizeResponse(await res.json());

        const firstNew =
          pick(data.items?.[0], ["enlace", "link", "url", "id", "_id", "titulo", "title", "headline"]);
        const firstOld =
          pick(items?.[0], ["enlace", "link", "url", "id", "_id", "titulo", "title", "headline"]);
        if (firstNew && firstNew !== firstOld) setHayNuevas(true);
      } catch {}
    }, 5 * 60 * 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, BASE_URL, items]);

  // ---------- UI ----------
  const openPanel = () => {
    setOpen(true);
    setHayNuevas(false);
  };
  const closePanel = () => setOpen(false);

  return (
    <>
      {/* Botón flotante - centrado en móvil, a la derecha en desktop */}
      <div
        className="
          fixed z-[100] bottom-4 left-1/2 -translate-x-1/2
          md:left-auto md:right-8 md:bottom-8 md:translate-x-0
          flex justify-center w-full md:w-auto pointer-events-none
        "
      >
        <button
          onClick={openPanel}
          className="
            pointer-events-auto flex items-center gap-2 px-5 py-3
            rounded-full shadow-2xl
            bg-[#b03a1a] text-white font-bold text-lg
            hover:bg-[#a87247] transition active:scale-95
            relative
          "
          aria-label={titulo}
        >
          <Megaphone size={22} className={`text-white ${hayNuevas ? "animate-bell" : ""}`} />
          <span className="hidden sm:inline">{titulo}</span>
          {hayNuevas && (
            <span
              className="absolute top-1 right-1 h-3 w-3 rounded-full bg-yellow-400 animate-ping"
              aria-hidden="true"
            />
          )}
        </button>
      </div>

      {/* Backdrop para cerrar al hacer click fuera */}
      {open && (
        <div
          className="fixed inset-0 bg-black/30 z-[95]"
          onClick={closePanel}
          aria-hidden="true"
        />
      )}

      {/* Panel / Sidebar (responsive) */}
      {open && (
        <aside
          role="dialog"
          aria-modal="true"
          className="
            fixed top-0 right-0 h-full w-full max-w-[420px]
            bg-white shadow-2xl border-l-4 border-[#b03a1a] z-[100]
            flex flex-col animate-slide-in
          "
        >
          <header className="flex items-center justify-between px-4 py-3 border-b bg-[#b03a1a]/10">
            <h2 className="font-bold text-[#b03a1a] text-lg">
              {endpoint === "juridicas" ? "Noticias jurídicas" : "Noticias generales"}
            </h2>
            <button
              onClick={closePanel}
              className="text-2xl font-bold hover:text-[#b03a1a]"
              aria-label="Cerrar noticias"
            >
              &times;
            </button>
          </header>

          <div
            className="p-3 overflow-y-auto flex-1"
            ref={sidebarRef}
            style={{ scrollbarWidth: "thin" }}
          >
            {/* Error */}
            {errorMsg && (
              <div className="mb-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded p-3">
                {errorMsg}
              </div>
            )}

            {/* Lista */}
            {items?.length > 0 ? (
              items.map((n, idx) => {
                const href = pick(n, ["enlace", "link", "url"]) || "#";
                const title = pick(n, ["titulo", "title", "headline"]) || "Sin título";
                const fuente = pick(n, ["fuente", "source"]);
                const fechaRaw = pick(n, ["fecha", "date", "publishedAt"]);
                const fecha = fechaRaw ? new Date(fechaRaw).toLocaleDateString("es-PE") : null;

                return (
                  <article key={href || title || idx} className="mb-3">
                    <div className="bg-[#fff6f3] rounded-xl p-3 shadow-md border hover:shadow-lg transition">
                      <div className="flex items-center mb-2">
                        {fuente && (
                          <span className="text-xs bg-[#b03a1a]/80 text-white px-2 py-0.5 rounded-full font-medium mr-2">
                            {fuente}
                          </span>
                        )}
                        <span className="ml-auto text-[11px] text-[#b03a1a] opacity-70">
                          {fecha}
                        </span>
                      </div>

                      <a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block font-bold text-[#b03a1a] text-[15px] leading-snug hover:underline hover:text-[#a87247] transition"
                      >
                        {title}
                      </a>

                      {n.resumen && (
                        <p
                          className="mt-1 text-sm text-[#3a2a20] opacity-85"
                          style={{
                            display: "-webkit-box",
                            WebkitBoxOrient: "vertical",
                            WebkitLineClamp: 3,
                            overflow: "hidden",
                          }}
                        >
                          {n.resumen}
                        </p>
                      )}
                    </div>
                  </article>
                );
              })
            ) : (
              !loading &&
              !errorMsg && (
                <p className="text-center text-gray-500">No hay noticias disponibles.</p>
              )
            )}

            {/* Loading / Fin */}
            {loading && (
              <p className="text-center text-[#b03a1a] py-3">Cargando…</p>
            )}
            {!hasMore && !loading && items.length > 0 && (
              <p className="text-center text-xs text-[#bbb] py-2">No hay más noticias.</p>
            )}
          </div>
        </aside>
      )}

      {/* Animaciones y micro-estilos */}
      <style>
        {`
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
        `}
      </style>
    </>
  );
}
