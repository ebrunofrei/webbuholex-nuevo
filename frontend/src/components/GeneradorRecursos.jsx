import React, { useState } from "react";
import useMembership from "../hooks/useMembership";
import ModalUpgradePro from "./ModalUpgradePro";

export default function GeneradorRecursos({ datos }) {
  const { isPro } = useMembership();
  const [showModal, setShowModal] = useState(false);
  const [resultado, setResultado] = useState("");

  function handleGenerar() {
    if (isPro) {
      // Lógica real de generación de recurso (puede ser con LitisBot)
      setResultado("Ejemplo de recurso legal generado automáticamente...");
    } else {
      setShowModal(true);
    }
  }

  return (
    <div className="my-4">
      <button
        className="bg-red-600 text-white px-4 py-2 rounded"
        onClick={handleGenerar}
      >
        Generar recurso automático
      </button>
      {resultado && (
        <div className="bg-gray-100 border p-3 mt-2 rounded">
          <b>Recurso generado:</b> {resultado}
        </div>
      )}
      {showModal && <ModalUpgradePro onClose={() => setShowModal(false)} />}
    </div>
  );
}
