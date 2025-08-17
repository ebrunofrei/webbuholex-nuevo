import React, { useState } from "react";
import useMembership from "../hooks/useMembership";
import ModalUpgradePro from "./ModalUpgradePro";

export default function TraduccionLegal({ texto }) {
  const { isPro } = useMembership();
  const [showModal, setShowModal] = useState(false);
  const [resultado, setResultado] = useState("");

  function handleTraducir() {
    if (isPro) {
      // Aquí tu lógica real de traducción (puede ser una llamada a tu backend IA)
      setResultado("Traducción de ejemplo al quechua o inglés...");
    } else {
      setShowModal(true);
    }
  }

  return (
    <div className="my-4">
      <button
        className="bg-blue-600 text-white px-4 py-2 rounded"
        onClick={handleTraducir}
      >
        Traducir al idioma seleccionado
      </button>
      {resultado && (
        <div className="bg-gray-100 p-2 mt-2 rounded">
          <b>Traducción:</b> {resultado}
        </div>
      )}
      {showModal && <ModalUpgradePro onClose={() => setShowModal(false)} />}
    </div>
  );
}
