// src/pages/CodigoLegalDetalle.jsx
import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { obtenerArticulosPorCodigo } from "@services/firebaseCodigosService";
import { useAuth } from "@/context/AuthContext";

export default function CodigoLegalDetalle() {
  const { codigoId } = useParams();
  const [articulos, setArticulos] = useState([]);
  const [codigoInfo, setCodigoInfo] = useState({});
  const { usuario } = useAuth(); // Para mostrar botones de edición si es admin

  useEffect(() => {
    async function cargarArticulos() {
      try {
        const arts = await obtenerArticulosPorCodigo(codigoId);
        setArticulos(arts);
        // Aquí puedes cargar info adicional del código si lo requieres
      } catch (err) {
        console.error("❌ Error cargando artículos:", err);
        setArticulos([]);
      }
    }
    cargarArticulos();
  }, [codigoId]);

  return (
    <div className="max-w-3xl mx-auto py-8">
      {/* Título principal */}
      <h1 className="text-3xl font-bold text-[#073763] mb-4">
        {codigoId.replace(/_/g, " ")}
      </h1>

      {/* Estado del código */}
      <div className="mb-4">
        <span
          className={`text-xs font-bold px-3 py-1 rounded
          ${
            codigoInfo.estadoNorma === "vigente"
              ? "bg-green-100 text-green-700"
              : codigoInfo.estadoNorma === "derogado"
              ? "bg-red-100 text-red-700"
              : codigoInfo.estadoNorma === "vacatio legis"
              ? "bg-blue-100 text-blue-700"
              : "bg-yellow-100 text-yellow-800"
          }`}
        >
          {codigoInfo.estadoNorma
            ? codigoInfo.estadoNorma.toUpperCase()
            : "SIN ESTADO"}
        </span>

        {/* Botón de edición visible solo si es admin */}
        {usuario?.esAdmin && (
          <button
            className="ml-3 text-blue-700 underline"
            onClick={() => {
              // TODO: abrir modal edición
              console.log("Abrir modal de edición de código");
            }}
          >
            Editar Código
          </button>
        )}
      </div>

      {/* Listado de artículos */}
      <div>
        {articulos.length === 0 ? (
          <p className="text-gray-500 italic text-lg">
            No se encontraron artículos en este código.
          </p>
        ) : (
          articulos.map((art) => (
            <div
              key={art.numero || art.id}
              className="mb-8 p-4 bg-white rounded-xl border shadow"
            >
              <div className="flex items-center justify-between mb-1">
                <h2 className="font-bold text-lg text-[#7a2518]">
                  {art.titulo || `Artículo ${art.numero}`}
                  {art.estadoVigencia && (
                    <span
                      className={`ml-2 text-xs font-bold px-2 py-0.5 rounded
                        ${
                          art.estadoVigencia === "vigente"
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700"
                        }`}
                    >
                      {art.estadoVigencia}
                    </span>
                  )}
                </h2>

                {/* Botón editar artículo */}
                {usuario?.esAdmin && (
                  <button
                    className="text-xs text-blue-600 underline"
                    onClick={() => {
                      // TODO: abrir modal edición artículo
                      console.log("Editar artículo", art.id);
                    }}
                  >
                    Editar
                  </button>
                )}
              </div>

              {/* Texto del artículo */}
              <div className="text-base whitespace-pre-line">
                {art.texto || "Sin contenido disponible"}
              </div>

              {/* Metadata del artículo */}
              <div className="mt-2 text-xs text-gray-500 flex gap-4">
                <span>
                  Últ. actualización:{" "}
                  {art.fecha_actualizacion || "No disponible"}
                </span>
                {art.areaEspecialidad && <span>{art.areaEspecialidad}</span>}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
