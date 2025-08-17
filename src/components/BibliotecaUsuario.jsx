import React, { useState } from "react";
import useMembership from "../hooks/useMembership";
import ModalUpgradePro from "./ModalUpgradePro";

const LIMITE_LIBROS_GRATIS = 3;

export default function BibliotecaUsuario({ libros, onSubirLibro }) {
  const { isPro } = useMembership();
  const [showModal, setShowModal] = useState(false);

  const puedeSubirMas = isPro || libros.length < LIMITE_LIBROS_GRATIS;

  function handleSubirLibro(file) {
    if (puedeSubirMas) {
      onSubirLibro(file);
    } else {
      setShowModal(true);
    }
  }

  function handleDescargarLibro(libro) {
    if (isPro) {
      window.open(libro.url, "_blank");
    } else {
      setShowModal(true);
    }
  }

  return (
    <div>
      <h3 className="text-xl font-semibold mb-3">Mi Biblioteca Personal</h3>
      <ul className="mb-4">
        {libros.map((libro, i) => (
          <li key={i} className="flex items-center gap-2 py-1">
            <span>{libro.titulo}</span>
            <button
              className="text-blue-600 underline"
              onClick={() => handleDescargarLibro(libro)}
            >
              Descargar
            </button>
          </li>
        ))}
      </ul>
      <input
        type="file"
        className="mb-2"
        onChange={e => handleSubirLibro(e.target.files[0])}
        disabled={!puedeSubirMas}
      />
      {!isPro && libros.length >= LIMITE_LIBROS_GRATIS && (
        <div className="bg-yellow-100 text-yellow-900 p-2 rounded mb-2 text-sm">
          Solo puedes subir {LIMITE_LIBROS_GRATIS} libros gratis. Suscríbete a PRO para biblioteca ilimitada.
        </div>
      )}
      {showModal && <ModalUpgradePro onClose={() => setShowModal(false)} />}
    </div>
  );
}
