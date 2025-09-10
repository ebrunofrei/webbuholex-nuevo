import React from "react";

export default function BlogPreviewCard({ articulo, onClick }) {
  if (!articulo) return null;

  return (
    <div
      className="w-full max-w-sm sm:max-w-md md:max-w-lg bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden hover:shadow-lg transition cursor-pointer mx-auto"
      onClick={onClick}
    >
      {/* Portada */}
      {articulo.urlPortada && (
        <img
          src={articulo.urlPortada}
          alt={articulo.titulo}
          className="w-full h-40 sm:h-52 object-cover"
        />
      )}

      {/* Contenido */}
      <div className="p-4 sm:p-5 flex flex-col gap-2">
        <h3 className="text-lg sm:text-xl font-bold text-[#7a2518] line-clamp-2">
          {articulo.titulo}
        </h3>
        <p className="text-sm sm:text-base text-gray-700 line-clamp-3">
          {articulo.resumen}
        </p>

        {/* Autor y fecha */}
        <div className="flex justify-between items-center mt-3 text-xs sm:text-sm text-gray-500">
          <span className="font-semibold">{articulo.autor || "Anónimo"}</span>
          <span>
            {new Date(articulo.fecha || Date.now()).toLocaleDateString("es-PE")}
          </span>
        </div>

        {/* Categoría y tags */}
        <div className="mt-2 flex flex-wrap gap-2">
          {articulo.categoria && (
            <span className="bg-[#e9dcc3] text-[#4b2e19] px-2 py-1 rounded-lg text-xs font-semibold">
              {articulo.categoria}
            </span>
          )}
          {articulo.tags?.map((tag) => (
            <span
              key={tag}
              className="bg-[#fde7e7] text-[#b03a1a] px-2 py-1 rounded-lg text-xs"
            >
              #{tag}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
