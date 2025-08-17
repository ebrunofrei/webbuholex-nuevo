import React, { useCallback } from "react";
import useSpeechRecognition from "./useSpeechRecognition";

export default function BotonMicrofono({ activo, setActivo, setInput }) {
  const { listening, start, stop, error } = useSpeechRecognition({
    onResult: texto => {
      setInput(t => (t ? `${t} ${texto}` : texto)); // agrega texto detectado al input
      setActivo(false);
    }
  });

  // Activar/desactivar con el botón
  function toggleMicrofono() {
    if (!listening) {
      start();
      setActivo(true);
    } else {
      stop();
      setActivo(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={toggleMicrofono}
        className={`rounded-full px-3 py-2 ${listening || activo ? 'bg-green-200' : 'bg-gray-200'}`}
        title={listening || activo ? "Desactivar micrófono" : "Activar micrófono"}
      >
        {listening || activo ? "🎤 ON" : "🎤 OFF"}
      </button>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
}
