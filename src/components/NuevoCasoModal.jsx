// src/components/NuevoCasoModal.jsx
import React, { useState } from "react";

export default function NuevoCasoModal({ open, onClose, onCrear }) {
  const [nombre, setNombre] = useState("");
  const [archivo, setArchivo] = useState(null);

  function handleCrear() {
    if (!nombre.trim()) return;
    onCrear(nombre.trim(), archivo);
    setNombre(""); setArchivo(null); onClose();
  }

  // Para limpiar cada vez que se abre/cierra:
  React.useEffect(() => {
    if (!open) {
      setNombre(""); setArchivo(null);
    }
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-3">
      <div className="bg-white rounded-2xl p-7 shadow-xl max-w-md w-full border-2 border-yellow-600 relative">
        <button className="absolute right-4 top-3 text-yellow-700 text-2xl font-bold" onClick={onClose}>×</button>
        <h2 className="font-bold text-2xl mb-4 text-yellow-700 flex items-center gap-2">
          Crear nuevo caso / expediente
        </h2>
        <input
          className="w-full px-4 py-2 mb-4 border rounded-xl text-lg"
          placeholder="Nombre del caso o expediente"
          value={nombre}
          onChange={e => setNombre(e.target.value)}
        />
        <input type="file" className="mb-4" onChange={e => setArchivo(e.target.files[0])} />
        {archivo && (
          <div className="mb-4 text-sm text-brown-500">
            <span className="font-semibold">Archivo seleccionado:</span> {archivo.name}
          </div>
        )}
        <div className="flex justify-center gap-4 mt-3">
          <button
            className="bg-yellow-600 px-6 py-2 rounded-xl text-white font-semibold shadow hover:bg-yellow-700"
            disabled={!nombre.trim()}
            onClick={handleCrear}
            type="button"
          >Crear</button>
          <button
            className="bg-gray-200 px-6 py-2 rounded-xl text-gray-700 font-semibold shadow hover:bg-gray-300"
            onClick={onClose}
            type="button"
          >Cancelar</button>
        </div>
      </div>
    </div>
  );
}
