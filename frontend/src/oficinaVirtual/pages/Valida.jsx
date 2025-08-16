import React, { useEffect, useState } from "react";

export default function Valida() {
  const [info, setInfo] = useState(null);
  const hash = new URLSearchParams(window.location.search).get("hash");

  useEffect(() => {
    // Llama tu backend para buscar ese hash
    fetch(`/api/verificar-firma?hash=${hash}`)
      .then(res => res.json())
      .then(data => setInfo(data));
  }, [hash]);

  if (!info) return <div className="p-6">Buscando datos de la firma...</div>;
  if (!info.existe) return <div className="p-6 text-red-600">No se encontró una firma válida para este documento.</div>;
  return (
    <div className="p-6 max-w-lg mx-auto">
      <h1 className="text-xl font-bold text-[#b03a1a] mb-2">Verificación de firma electrónica</h1>
      <div><b>Abogado:</b> {info.nombre}</div>
      <div><b>Colegiatura:</b> {info.colegiatura}</div>
      <div><b>Expediente:</b> {info.expediente}</div>
      <div><b>Fecha de firma:</b> {info.fecha}</div>
      <div><b>Hash del documento:</b> {info.hash}</div>
      <div className="mt-2 text-green-700 font-bold">
        Documento generado y firmado desde la plataforma Buholex.
      </div>
    </div>
  );
}
