// src/pages/HistorialArchivos.jsx
import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { obtenerHistorialArchivos } from "@services/firebaseLitisBotService";

export default function HistorialArchivos() {
  const { user } = useAuth();
  const [archivos, setArchivos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      if (!user) return;
      setLoading(true);
      try {
        const data = await obtenerHistorialArchivos(user.uid);
        setArchivos(data);
      } catch (err) {
        console.error("❌ Error cargando historial de archivos:", err);
        setArchivos([]);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [user]);

  if (loading) {
    return <div className="text-center mt-12 text-2xl">Cargando historial...</div>;
  }

  if (!archivos || archivos.length === 0) {
    return (
      <div className="text-center mt-12 text-gray-500 text-2xl">
        No hay archivos en tu historial.
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <h1 className="text-4xl font-extrabold mb-6 text-blue-900 drop-shadow">
        Historial de Archivos
      </h1>
      <ul className="space-y-6">
        {archivos.map((archivo) => (
          <li
            key={archivo.id}
            className="border-b pb-4 flex justify-between items-center"
          >
            <div>
              <h2 className="text-xl font-bold text-gray-800">
                {archivo.nombre}
              </h2>
              <p className="text-gray-600 text-lg">
                {archivo.fecha
                  ? new Date(archivo.fecha).toLocaleString()
                  : "Sin fecha"}
              </p>
            </div>
            {archivo.url && (
              <a
                href={archivo.url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-blue-600 text-white text-lg rounded hover:bg-blue-800"
              >
                Ver archivo
              </a>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
