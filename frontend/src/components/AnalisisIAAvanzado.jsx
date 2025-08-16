import React, { useState } from "react";
import useMembership from "../hooks/useMembership";
import ModalUpgradePro from "./ModalUpgradePro";

export default function AnalisisIAAvanzado({ documento }) {
  const { isPro } = useMembership();
  const [showModal, setShowModal] = useState(false);
  const [analisis, setAnalisis] = useState("");

  function handleAnalizar() {
    if (isPro) {
      // Lógica real de análisis IA (llama a backend, etc.)
      setAnalisis("Resultado del análisis avanzado del documento...");
    } else {
      setShowModal(true);
    }
  }

  return (
    <div className="my-4">
      <button
        className="bg-green-600 text-white px-4 py-2 rounded"
        onClick={handleAnalizar}
      >
        Analizar con IA avanzada
      </button>
      {analisis && (
        <div className="bg-gray-50 border p-3 mt-2 rounded">
          <b>Análisis IA:</b> {analisis}
        </div>
      )}
      {showModal && <ModalUpgradePro onClose={() => setShowModal(false)} />}
    </div>
  );
}
