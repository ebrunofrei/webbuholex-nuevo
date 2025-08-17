import React from "react";
import UploadZone from "./UploadZone";

export default function Documentos() {
  return (
    <div className="p-6 bg-white rounded shadow-md">
      <h1 className="text-2xl font-bold text-red-600 mb-4">📁 Gestión de Documentos</h1>
      <p className="text-gray-700 mb-6">
        Puedes arrastrar archivos aquí o hacer clic para subirlos directamente al expediente correspondiente.
      </p>
      {/* Puedes pasar el ID del expediente si lo deseas */}
      <ExploradorDeArchivos expedienteId="00198-2025" />
    </div>
  );
}
