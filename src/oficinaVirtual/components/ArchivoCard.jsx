// webapp-frontend/src/oficinaVirtual/components/ArchivoCard.jsx
import React, { useState } from "react";
import { Edit3, Trash2, Eye, ArrowDownToLine } from "lucide-react";

export default function ArchivoCard({ archivo, onRenombrar, onEliminar }) {
  const [editando, setEditando] = useState(false);
  const [nuevoNombre, setNuevoNombre] = useState(archivo.nombre);

  const handleSubmit = (e) => {
    e.preventDefault();
    const nombreLimpio = nuevoNombre.trim();
    if (nombreLimpio && nombreLimpio !== archivo.nombre) {
      onRenombrar(archivo.id, nombreLimpio);
    }
    setEditando(false);
  };

  // Icono según tipo de archivo
  const icono = archivo.tipo?.includes("pdf") ? (
    <span className="text-red-600">📄</span>
  ) : archivo.tipo?.includes("image") ? (
    <span className="text-green-600">🖼️</span>
  ) : (
    <span className="text-gray-600">📁</span>
  );

  return (
    <div className="flex items-center justify-between p-3 bg-white rounded shadow-sm">
      <div className="flex items-center gap-3">
        {icono}
        {editando ? (
          <form onSubmit={handleSubmit} className="flex items-center gap-2">
            <input
              value={nuevoNombre}
              onChange={(e) => setNuevoNombre(e.target.value)}
              className="border rounded px-2 py-1 text-sm"
            />
            <button type="submit" className="text-blue-600 text-sm">
              OK
            </button>
            <button
              type="button"
              onClick={() => {
                setEditando(false);
                setNuevoNombre(archivo.nombre);
              }}
              className="text-gray-500 text-sm"
            >
              ✕
            </button>
          </form>
        ) : (
          <span
            className="text-sm font-medium cursor-pointer"
            title="Ver archivo"
            onClick={() =>
              window.open(archivo.url, "_blank", "noopener,noreferrer")
            }
          >
            {archivo.nombre}
          </span>
        )}
      </div>

      <div className="flex items-center gap-4">
        {/* Ver en nueva ventana */}
        <button
          onClick={() =>
            window.open(archivo.url, "_blank", "noopener,noreferrer")
          }
          title="Ver archivo"
          className="flex items-center text-blue-600 hover:text-blue-800 text-sm"
        >
          <Eye size={18} />
        </button>

        {/* Descargar */}
        <a
          href={archivo.url}
          download={archivo.nombre}
          target="_blank"
          rel="noopener noreferrer"
          title="Descargar archivo"
          className="flex items-center text-gray-600 hover:text-gray-800 text-sm"
        >
          <ArrowDownToLine size={18} />
        </a>

        {/* Renombrar */}
        <button
          onClick={() => setEditando(true)}
          title="Renombrar archivo"
          className="flex items-center text-yellow-600 hover:text-yellow-800 text-sm"
        >
          <Edit3 size={16} />
        </button>

        {/* Eliminar */}
        <button
          onClick={() => onEliminar(archivo)}
          title="Eliminar archivo"
          className="flex items-center text-red-600 hover:text-red-800 text-sm"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
}
