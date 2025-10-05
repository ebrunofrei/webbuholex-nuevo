// src/oficinaVirtual/pages/NoticiasGuardadas.jsx
import React from "react";
import { useNoticiasGuardadas } from "@/hooks/useNoticiasGuardadas";

export default function NoticiasGuardadas() {
  const { guardadas, quitarNoticia } = useNoticiasGuardadas();

  if (!guardadas || guardadas.length === 0) {
    return (
      <div className="p-6 text-center text-gray-500">
        <p>No tienes noticias guardadas todavía.</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-xl font-bold mb-4">📰 Noticias guardadas</h2>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {guardadas.map((n) => (
          <div
            key={n._id}
            className="bg-white shadow rounded-lg p-4 flex flex-col justify-between"
          >
            <div>
              <h3 className="text-lg font-semibold text-red-600 mb-2">
                {n.titulo}
              </h3>
              <p className="text-sm text-gray-700 line-clamp-3">{n.contenido}</p>
            </div>

            <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
              <span>{n.fuente}</span>
              <span>{new Date(n.fecha).toLocaleDateString("es-PE")}</span>
            </div>

            <div className="mt-4 flex items-center justify-between">
              <a
                href={n.enlace}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline text-sm"
              >
                Ver noticia completa
              </a>
              <button
                onClick={() => quitarNoticia(n._id)}
                className="text-xs text-red-500 hover:text-red-700"
              >
                Quitar
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
