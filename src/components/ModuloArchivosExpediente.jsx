import React, { useState } from "react";
import useMembership from "../hooks/useMembership";
import ModalUpgradePro from "./ModalUpgradePro";

const LIMITE_ARCHIVOS_GRATIS = 2;

export default function ModuloArchivosExpediente({ archivos, onSubirArchivo, ...props }) {
  const { isPro } = useMembership();
  const [showModal, setShowModal] = useState(false);

  // Control de límite gratis
  const puedeSubirMas = isPro || archivos.length < LIMITE_ARCHIVOS_GRATIS;

  function handleSubirArchivo(file) {
    if (puedeSubirMas) {
      onSubirArchivo(file);
    } else {
      setShowModal(true);
    }
  }

  function handleDescargarArchivo(archivo) {
    if (isPro) {
      // descarga normal
      window.open(archivo.url, "_blank");
    } else {
      setShowModal(true);
    }
  }

  return (
    <div>
      <h3 className="text-xl font-semibold mb-3">Archivos del expediente</h3>
      <ul className="mb-4">
        {archivos.map((archivo, i) => (
          <li key={i} className="flex items-center gap-2 py-1">
            <span>{archivo.nombre}</span>
            <button
              className="text-blue-600 underline"
              onClick={() => handleDescargarArchivo(archivo)}
            >
              Descargar
            </button>
          </li>
        ))}
      </ul>
      <input
        type="file"
        className="mb-2"
        onChange={e => handleSubirArchivo(e.target.files[0])}
        disabled={!puedeSubirMas}
      />
      {!isPro && archivos.length >= LIMITE_ARCHIVOS_GRATIS && (
        <div className="bg-yellow-100 text-yellow-900 p-2 rounded mb-2 text-sm">
          Solo puedes subir {LIMITE_ARCHIVOS_GRATIS} archivos gratis. Mejora a PRO para gestionar ilimitados.
        </div>
      )}
      {showModal && <ModalUpgradePro onClose={() => setShowModal(false)} />}
    </div>
  );
}
