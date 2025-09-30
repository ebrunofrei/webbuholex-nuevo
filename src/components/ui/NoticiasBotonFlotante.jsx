import React, { useState, useEffect, useRef } from "react";

const BASE_URL = "/api/noticias?tipo=general"; // 👈 generales para el Home
const NOTICIAS_POR_PAGINA = 8;

export default function NoticiasBotonFlotante() {
  const [open, setOpen] = useState(false);
  const [noticias, setNoticias] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const sidebarRef = useRef();

  useEffect(() => {
    if (open && noticias.length === 0) fetchNoticias(1);
  }, [open]);

  const fetchNoticias = async (pagina = 1) => {
    if (loading) return;
    setLoading(true);
    try {
      const res = await fetch(`${BASE_URL}&page=${pagina}&limit=${NOTICIAS_POR_PAGINA}`);
      const data = await res.json();
      setNoticias((prev) => (pagina === 1 ? data.items : [...prev, ...data.items]));
      setHasMore(data.hasMore);
      setPage(pagina);
    } catch (err) {
      console.error("❌ Error cargando noticias generales:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Botón flotante */}
      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-6 right-6 bg-[#b03a1a] hover:bg-[#8a2d16] text-white px-4 py-3 rounded-full shadow-lg z-50"
      >
        📰 Noticias
      </button>

      {/* Panel lateral */}
      {open && (
        <div
          ref={sidebarRef}
          className="fixed right-0 top-0 h-full w-[90vw] sm:w-[480px] bg-white shadow-2xl p-6 overflow-y-auto z-50"
        >
          <h2 className="text-2xl font-extrabold text-[#b03a1a] mb-4">Noticias Generales</h2>
          <div className="space-y-4">
            {noticias.map((n, i) => (
              <div key={n.enlace || i} className="p-4 border rounded-lg shadow-sm hover:shadow-md transition">
                <a
                  href={n.enlace}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-bold text-lg text-[#b03a1a] hover:underline"
                >
                  {n.titulo}
                </a>
                <p className="text-sm text-gray-600">{n.resumen}</p>
                <span className="text-xs text-gray-400">{n.fecha?.substring(0, 10)}</span>
              </div>
            ))}
          </div>

          {loading && <p className="text-center text-gray-500 py-4">Cargando...</p>}

          {hasMore && !loading && (
            <div className="text-center mt-4">
              <button
                onClick={() => fetchNoticias(page + 1)}
                className="px-6 py-2 bg-[#164a8a] text-white rounded-lg shadow hover:bg-[#0f3263]"
              >
                Ver más
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );
}
