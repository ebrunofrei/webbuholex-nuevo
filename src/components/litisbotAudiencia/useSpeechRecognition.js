import { useEffect, useRef, useState } from "react";

export default function useSpeechRecognition({ onResult, autoStop = true }) {
  const recognitionRef = useRef(null);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Compatibilidad Chrome, Edge, etc.
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError("Reconocimiento de voz no soportado en este navegador.");
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = "es-PE";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => setListening(true);
    recognition.onend = () => setListening(false);

    recognition.onerror = (e) => setError(e.error || "Error de reconocimiento de voz.");
    recognition.onresult = (e) => {
      const texto = e.results[0][0].transcript;
      if (onResult) onResult(texto);
      if (autoStop) recognition.stop();
    };

    recognitionRef.current = recognition;
    // Cleanup
    return () => recognition && recognition.abort();
  }, [onResult, autoStop]);

  // Funciones para el componente
  function start() {
    setError(null);
    recognitionRef.current && recognitionRef.current.start();
  }
  function stop() {
    recognitionRef.current && recognitionRef.current.stop();
  }

  return { listening, start, stop, error };
}
