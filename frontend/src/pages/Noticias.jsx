// src/pages/Noticias.jsx
import React, { useEffect, useState } from "react";

export default function Noticias() {
  const [noticias, setNoticias] = useState([]);
  const [loading, setLoading] = useState(true);

  // Ahora todo es automático y viene del microservicio proxy
  useEffect(() => {
    async function fetchNoticias() {
      setLoading(true);
      try {
        const res = await fetch("/api/noticias-juridicas");
        const datos = await res.json();
        setNoticias(datos);
      } catch (e) {
        setNoticias([]);
      } finally {
        setLoading(false);
      }
    }
    fetchNoticias();
  }, []);

  return (
    <div className="min-h-screen bg-white px-4 py-10 md:px-24 lg:px-48">
      <h1 className="text-3xl font-extrabold text-center mb-8 text-[#b03a1a] tracking-tight">
        Noticias Jurídicas Inteligentes
      </h1>

      {loading && (
        <div className="flex justify-center py-10">
          <span className="text-[#b03a1a] font-medium animate-pulse">Cargando noticias...</span>
        </div>
      )}

      {!loading && noticias.length === 0 && (
        <div className="text-center text-gray-500 py-10">
          No se encontraron noticias recientes.
        </div>
      )}

      <div className="space-y-8">
        {noticias.map((n, i) => (
          <div key={i} className="rounded-xl shadow p-5 border border-[#e8d3c3] bg-[#fff6f3] hover:shadow-lg transition">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-2">
              <span className="text-xs bg-[#b03a1a]/80 text-white px-2 py-0.5 rounded-full font-medium mb-1 md:mb-0">
                {n.fuente}
              </span>
              <span className="text-xs text-[#b03a1a] opacity-80">
                {n.fecha ? new Date(n.fecha).toLocaleDateString() : ""}
              </span>
            </div>
            <a
              href={n.enlace}
              target="_blank"
              rel="noopener noreferrer"
              className="block font-bold text-[#b03a1a] text-lg leading-snug hover:underline hover:text-[#a87247] transition"
              style={{ wordBreak: "break-word" }}
            >
              {n.titulo}
            </a>
            <p className="mt-1 text-sm text-[#3a2a20] opacity-85">
              {n.resumen}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
