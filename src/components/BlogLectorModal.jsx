import React from "react";

export default function BlogLectorModal({ articulo, onClose }) {
  if (!articulo) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-2xl mx-2 max-h-[92vh] flex flex-col">
        <button
          className="absolute top-2 right-3 text-2xl text-[#7a2518] font-bold z-10"
          onClick={onClose}
          aria-label="Cerrar"
        >×</button>
        <div className="overflow-y-auto p-6 pt-10">
          <h2 className="text-xl md:text-2xl font-bold text-[#7a2518] mb-2">
            {articulo.titulo}
          </h2>
          <div className="text-[#3e2723] font-semibold mb-1">
            {articulo.autor} · <span className="text-xs">{articulo.categoria}</span>
          </div>
          <div className="text-gray-800 mb-2 italic">{articulo.resumen}</div>
          <div
            className="text-[#222] whitespace-pre-line mb-2"
            style={{ fontSize: "1.09em", lineHeight: "1.7" }}
          >
            {articulo.contenido}
          </div>
          {articulo.tags && articulo.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {articulo.tags.map((tag, i) => (
                <span
                  key={i}
                  className="px-3 py-1 rounded bg-[#7a2518] text-white text-xs"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
          <div className="text-xs text-[#3e2723] mt-6">
            {articulo.fecha
              ? new Date(articulo.fecha).toLocaleDateString()
              : ""}
          </div>
        </div>
      </div>
    </div>
  );
}
