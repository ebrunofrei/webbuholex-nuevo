// src/pages/Codigos.jsx
import React, { useEffect, useState } from "react";
import { obtenerCodigos } from "../services/firebaseCodigosService";
import { Link } from "react-router-dom";

export default function Codigos() {
  const [codigos, setCodigos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let activo = true;
    setLoading(true);
    setError(null);
    obtenerCodigos()
      .then(datos => {
        // Puedes ordenar por título (opcional)
        const ordenados = datos.sort((a, b) =>
          (a.titulo || a.codigo).localeCompare(b.titulo || b.codigo)
        );
        if (activo) setCodigos(ordenados);
      })
      .catch(e => setError("Error al cargar códigos"))
      .finally(() => setLoading(false));
    return () => { activo = false; };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <span className="text-lg text-gray-400">Cargando códigos legales...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <span className="text-red-500">{error}</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white px-4 py-10 md:px-20">
      <h1 className="text-3xl font-bold text-center mb-8 text-[#7a2518] drop-shadow">
        Códigos Legales del Perú
      </h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {codigos.map((codigo) => (
          <Link
            key={codigo.id}
            to={`/codigos/${codigo.id}`}
            className="block bg-[#f9f7f4] border border-[#e5e7eb] rounded-2xl shadow-md hover:shadow-xl hover:border-[#e0b020] transition-all p-5 group focus:outline-none focus:ring-2 focus:ring-[#e0b020]"
            tabIndex={0}
            aria-label={`Ver detalles del ${codigo.titulo || codigo.codigo}`}
          >
            <div className="flex flex-col h-full">
              <h2 className="text-lg font-bold text-[#073763] group-hover:text-[#e0b020] mb-2">
                {codigo.titulo || codigo.codigo}
              </h2>
              <span className="text-xs font-medium text-gray-500 mb-1">
                {codigo.año ? <>Año: <span className="font-bold">{codigo.año}</span></> : "Año desconocido"}
              </span>
              <span className="text-xs text-gray-400 truncate mb-2">
                {codigo.fuente || "Fuente no disponible"}
              </span>
              <span className={`mt-auto text-xs rounded py-1 px-3 font-bold 
                ${
                  codigo.estadoNorma === "vigente"
                    ? "bg-green-100 text-green-700"
                    : codigo.estadoNorma === "derogado"
                    ? "bg-red-100 text-red-700"
                    : codigo.estadoNorma === "vacatio legis"
                    ? "bg-blue-100 text-blue-700"
                    : "bg-yellow-100 text-yellow-800"
                }
              `}>
                {codigo.estadoNorma ? codigo.estadoNorma.toUpperCase() : "SIN ESTADO"}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
