import { useRef, useState } from "react";

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition || null;

export default function useSpeechToText({ idioma = "es-PE" } = {}) {
  const [listening, setListening] = useState(false);
  const [lastResult, setLastResult] = useState("");
  const recognitionRef = useRef(null);

  const start = () => {
    if (!SpeechRecognition) {
      alert("El reconocimiento de voz no está disponible en este navegador.");
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = idioma;
    recognition.interimResults = false;
    setListening(true);

    recognition.onresult = (event) => {
      const texto = event.results[0][0].transcript;
      setLastResult(texto);
      setListening(false);
    };
    recognition.onerror = () => setListening(false);
    recognition.onend = () => setListening(false);

    recognitionRef.current = recognition;
    recognition.start();
  };

  const stop = () => {
    recognitionRef.current?.stop();
    setListening(false);
  };

  return {
    listening,
    lastResult,
    setLastResult,
    start,
    stop,
    SpeechRecognitionAvailable: !!SpeechRecognition
  };
}
