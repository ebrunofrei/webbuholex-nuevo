// BlogArticuloCard.jsx
import React from "react";

export default function BlogArticuloCard({ articulo, onEditar, onEliminar, isAdmin, onVerMas }) {
  return (
    <div className="rounded-xl border border-[#7a2518] bg-white p-5 mb-6 shadow-lg max-w-2xl mx-auto relative">
      <div className="flex flex-col gap-2">
        <h3 className="text-xl font-extrabold text-[#7a2518]">{articulo.titulo}</h3>
        <div className="text-xs text-[#7a2518] font-bold">{articulo.categoria}</div>
        <div className="text-sm font-semibold text-gray-700">
          {articulo.autor?.toUpperCase()}
          <span className="ml-2 text-gray-500 text-xs">{/* Aquí puedes formatear la fecha */}</span>
        </div>
        {articulo.resumen && (
          <div className="italic text-gray-700 mb-2">
            <b>{articulo.resumen.length > 180 
              ? articulo.resumen.slice(0, 180) + '...' 
              : articulo.resumen}
            </b>
            {" "}
            <button
              className="text-[#7a2518] font-bold underline ml-2"
              onClick={() => onVerMas(articulo)}
            >
              Ver más
            </button>
          </div>
        )}
        {/* Si tienes portada */}
        {articulo.urlPortada && (
          <img src={articulo.urlPortada} alt="portada" className="rounded mb-3 max-h-48 object-cover mx-auto" />
        )}
        <div className="flex flex-wrap gap-1 mb-2">
          {(articulo.tags || []).map(tag => (
            <span key={tag} className="bg-[#7a2518] text-white px-2 py-0.5 rounded text-xs">{tag}</span>
          ))}
        </div>
        {/* Botones solo para admin */}
        {isAdmin && (
          <div className="flex gap-2 mt-2">
            <button
              className="px-3 py-1 rounded bg-[#3e2723] text-white font-semibold"
              onClick={() => onEditar(articulo)}
            >
              Editar
            </button>
            <button
              className="px-3 py-1 rounded bg-red-700 text-white font-bold"
              onClick={() => onEliminar(articulo)}
            >
              Eliminar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
