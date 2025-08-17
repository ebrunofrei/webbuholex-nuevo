import React from "react";
import LitisBotChatPRO from "../../components/LitisBotChatPRO";

// Si tienes props de expediente o contexto, pásalos
// Ejemplo: const { expedienteId, expediente } = props;

export default function LitisBotAudiencia({ expedienteId = null, expediente = null, onClose }) {
  return (
    <div className="bg-white shadow rounded-xl max-w-2xl mx-auto p-6 h-[600px] flex flex-col">
      <h2 className="text-xl font-bold mb-2 text-[#b03a1a] flex items-center gap-2">
        
        
      </h2>
      {/* El componente chat avanzado */}
      <LitisBotChatPRO
        expedienteId={expedienteId}
        contextoExpediente={expediente}
        gateFree={10} // O el límite que tú determines para free
      />

      {/* Botón de cerrar (si es modal/popup) */}
      {onClose && (
        <button
          className="mt-4 bg-gray-200 px-4 py-2 rounded"
          onClick={onClose}
        >
          Cerrar
        </button>
      )}
    </div>
  );
}
