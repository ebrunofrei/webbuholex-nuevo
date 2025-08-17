// src/oficinaVirtual/componentes/PerfilFirmaEscaneada.jsx

import React, { useRef, useState } from "react";

export default function PerfilFirmaEscaneada({ firmaUrl, setFirmaUrl }) {
  const [mensaje, setMensaje] = useState("");
  const fileInput = useRef();

  function handleUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.match(/image\/(png|jpeg)/)) {
      setMensaje("Solo se acepta PNG o JPG.");
      return;
    }
    if (file.size > 500 * 1024) {
      setMensaje("Archivo demasiado grande. Debe ser menor a 500KB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setFirmaUrl(reader.result); // Aquí se podría guardar en backend/cloud
      setMensaje("Firma cargada correctamente.");
    };
    reader.readAsDataURL(file);
  }

  return (
    <div className="my-4">
      <h3 className="font-bold mb-2 text-[#b03a1a]">Tu firma escaneada</h3>
      <div className="flex items-center gap-4">
        {firmaUrl ? (
          <img src={firmaUrl} alt="Firma escaneada" className="h-16 border p-1 rounded shadow bg-white" />
        ) : (
          <div className="h-16 w-40 bg-gray-100 flex items-center justify-center rounded border text-gray-400">Sin firma</div>
        )}
        <button
          className="px-3 py-1 bg-blue-600 text-white rounded disabled:bg-gray-300"
          onClick={() => fileInput.current.click()}
          disabled={!!firmaUrl}
        >
          {firmaUrl ? "Firma registrada" : "Subir firma"}
        </button>
        <input
          type="file"
          accept="image/png, image/jpeg"
          ref={fileInput}
          onChange={handleUpload}
          className="hidden"
          disabled={!!firmaUrl}
        />
      </div>
      {firmaUrl && (
        <div className="text-xs text-green-700 mt-1">
          Tu firma ha sido registrada. Si necesitas cambiarla, contacta soporte y valida tu identidad.
        </div>
      )}
      <div className="text-xs mt-2 text-gray-600">{mensaje}</div>
    </div>
  );
}
