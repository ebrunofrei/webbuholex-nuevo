import React from "react";

export default function NoticiasSlidebar({ open, onClose, noticias }) {
  return (
    <div
      className={`fixed top-0 right-0 h-full w-80 bg-white shadow-2xl border-l-4 border-[#b03a1a] z-[1000] transition-transform duration-300 ${
        open ? "translate-x-0" : "translate-x-full"
      }`}
      style={{ maxWidth: "90vw" }}
    >
      <div className="flex justify-between items-center px-5 py-4 border-b">
        <h2 className="text-xl font-bold text-[#b03a1a]">Noticias</h2>
        <button
          onClick={onClose}
          className="text-2xl font-bold text-[#b03a1a] hover:text-[#a87247] focus:outline-none"
        >
          ×
        </button>
      </div>
      <div className="px-5 py-3 overflow-y-auto h-[90vh]">
        {noticias && noticias.length > 0 ? (
          noticias.map((n, i) => (
            <div key={i} className="mb-4">
              <div className="font-semibold text-[#4b2e19]">{n.titulo}</div>
              <div className="text-sm text-[#b03a1a]">{n.resumen}</div>
            </div>
          ))
        ) : (
          <div className="text-gray-400 text-center mt-12">No hay noticias recientes.</div>
        )}
      </div>
    </div>
  );
}
