// src/components/NoticiasSliderFloat.jsx
import React, { useState, useEffect } from "react";
import { getNoticias } from "@/services/noticiasApi";

export default function NoticiasSliderFloat({ tipo = "general" }) {
  const [open, setOpen] = useState(false);
  const [noticias, setNoticias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [noticiaActual, setNoticiaActual] = useState(null);

  // Fetch noticias
  useEffect(() => {
    setLoading(true);
    getNoticias({ tipo, page: 1, limit: 12 })
      .then((data) => setNoticias(data.items || []))
      .catch(() => setNoticias([]))
      .finally(() => setLoading(false));
  }, [tipo]);

  return (
    <>
      {/* Botón flotante */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-40 bg-[#b03a1a] text-white p-3 rounded-full shadow-lg hover:bg-[#4b2e19] transition"
        title="Ver noticias"
        aria-label="Noticias"
      >
        <span className="material-icons" style={{ fontSize: 28 }}>
          campaign
        </span>
      </button>

      {/* Sidebar */}
      {open && (
        <div className="fixed top-0 right-0 h-full w-full sm:w-96 bg-white shadow-2xl border-l-4 border-[#b03a1a] z-50 flex flex-col animate-slide-in">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b bg-[#fff7f5]">
            <h2 className="font-bold text-[#b03a1a] text-lg">
              {tipo === "juridica" ? "Noticias Jurídicas" : "Noticias Generales"}
            </h2>
            <button
              onClick={() => setOpen(false)}
              className="text-2xl font-bold hover:text-[#b03a1a]"
            >
              ×
            </button>
          </div>

          {/* Listado */}
          <div className="p-4 overflow-y-auto flex-1 space-y-4">
            {loading ? (
              <div className="text-center text-[#b03a1a]">Cargando...</div>
            ) : noticias.length > 0 ? (
              noticias.map((n, idx) => (
                <article
                  key={idx}
                  className="pb-3 border-b last:border-0 cursor-pointer"
                >
                  {n.enlace ? (
                    <a
                      href={n.enlace}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-semibold text-[#b03a1a] hover:underline block"
                    >
                      {n.titulo}
                    </a>
                  ) : (
                    <button
                      onClick={() => setNoticiaActual(n)}
                      className="font-semibold text-left text-[#b03a1a] hover:underline focus:outline-none"
                    >
                      {n.titulo}
                    </button>
                  )}

                  {/* Resumen */}
                  {n.contenido && (
                    <p className="text-sm text-gray-700 mt-1 line-clamp-2">
                      {n.contenido}
                    </p>
                  )}

                  {/* Fuente + fecha */}
                  <p className="text-xs text-gray-500 mt-1">
                    {n.fuente || "Fuente desconocida"} •{" "}
                    {n.fecha &&
                      new Date(n.fecha).toLocaleDateString("es-PE", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                      })}
                  </p>
                </article>
              ))
            ) : (
              <div className="text-center text-gray-500">Sin noticias.</div>
            )}
          </div>
        </div>
      )}

      {/* Modal lector */}
      {noticiaActual && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-2">
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">
            <button
              className="absolute top-2 right-3 text-2xl text-[#b03a1a] font-bold z-10"
              onClick={() => setNoticiaActual(null)}
              aria-label="Cerrar"
            >
              ×
            </button>
            <div className="overflow-y-auto p-6 pt-10">
              <h2 className="text-lg md:text-xl font-bold text-[#b03a1a] mb-2">
                {noticiaActual.titulo}
              </h2>
              {noticiaActual.contenido && (
                <div
                  className="text-[#222] whitespace-pre-line mb-2"
                  style={{ fontSize: "1.09em", lineHeight: "1.7" }}
                >
                  {noticiaActual.contenido}
                </div>
              )}
              {noticiaActual.fecha && (
                <div className="text-xs text-[#b03a1a] mt-4">
                  {new Date(noticiaActual.fecha).toLocaleDateString("es-PE", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Animación */}
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
