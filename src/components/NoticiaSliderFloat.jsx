import React, { useState, useEffect } from "react";

const PROXY = "/api/noticias-juridicas"; // Vite proxy al backend

export default function NoticiaSliderFloat() {
  const [open, setOpen] = useState(false);
  const [noticias, setNoticias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [noticiaActual, setNoticiaActual] = useState(null); // Modal lector

  // Fetch automatizado al cargar
  useEffect(() => {
    setLoading(true);
    fetch(PROXY)
      .then(res => res.json())
      .then(data => setNoticias(data || []))
      .catch(() => setNoticias([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      {/* Botón flotante */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-40 bg-[#b03a1a] text-white p-3 rounded-full shadow-lg hover:bg-[#4b2e19] transition"
        title="Ver noticias"
        aria-label="Noticias"
      >
        <span className="material-icons" style={{ fontSize: 28 }}>campaign</span>
      </button>

      {/* Sidebar */}
      {open && (
        <div className="fixed top-0 right-0 h-full w-80 bg-white shadow-2xl border-l-4 border-[#b03a1a] z-50 flex flex-col animate-slide-in"
          style={{ maxWidth: 340 }}>
          <div className="flex items-center justify-between px-4 py-3 border-b bg-[#fff7f5]">
            <h2 className="font-bold text-[#b03a1a] text-lg">Noticias jurídicas</h2>
            <button onClick={() => setOpen(false)} className="text-2xl font-bold hover:text-[#b03a1a]">&times;</button>
          </div>
          <div className="p-4 overflow-y-auto flex-1">
            {loading ? (
              <div className="text-center text-[#b03a1a]">Cargando...</div>
            ) : noticias?.length > 0 ? (
              noticias.map((n, idx) => (
                <div key={idx} className="mb-4 pb-2 border-b last:border-0">
                  {/* Titular: abre modal o es enlace externo */}
                  {n.enlace ? (
                    <a
                      href={n.enlace}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-semibold text-[#b03a1a] hover:underline"
                    >
                      {n.titulo}
                    </a>
                  ) : n.contenido ? (
                    <button
                      onClick={() => setNoticiaActual(n)}
                      className="font-semibold text-left text-[#b03a1a] hover:underline focus:outline-none"
                    >
                      {n.titulo}
                    </button>
                  ) : (
                    <span className="font-semibold text-[#b03a1a]">{n.titulo}</span>
                  )}
                  <p className="text-sm text-gray-700">{n.resumen}</p>
                  <div className="text-xs text-[#b03a1a] mt-1 opacity-70">
                    {n.fecha && (
                      typeof n.fecha === "string"
                        ? n.fecha
                        : new Date(n.fecha).toLocaleDateString()
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center text-gray-500">Sin noticias.</div>
            )}
          </div>
        </div>
      )}

      {/* Modal lector de noticia */}
      {noticiaActual && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg mx-2 max-h-[90vh] flex flex-col">
            <button
              className="absolute top-2 right-3 text-2xl text-[#b03a1a] font-bold z-10"
              onClick={() => setNoticiaActual(null)}
              aria-label="Cerrar"
            >×</button>
            <div className="overflow-y-auto p-6 pt-10">
              <h2 className="text-lg md:text-xl font-bold text-[#b03a1a] mb-2">
                {noticiaActual.titulo}
              </h2>
              <div className="text-gray-800 mb-3">{noticiaActual.resumen}</div>
              <div className="text-[#222] whitespace-pre-line mb-2" style={{ fontSize: "1.09em", lineHeight: "1.7" }}>
                {noticiaActual.contenido}
              </div>
              {noticiaActual.fecha && (
                <div className="text-xs text-[#b03a1a] mt-4">
                  {typeof noticiaActual.fecha === "string"
                    ? noticiaActual.fecha
                    : new Date(noticiaActual.fecha).toLocaleDateString()}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Animación simple con Tailwind */}
      <style>
        {`
        .animate-slide-in {
          animation: slideInRight 0.3s cubic-bezier(.46,.03,.52,.96);
        }
        @keyframes slideInRight {
          0% { transform: translateX(100%);}
          100% { transform: translateX(0);}
        }
        `}
      </style>
    </>
  );
}
