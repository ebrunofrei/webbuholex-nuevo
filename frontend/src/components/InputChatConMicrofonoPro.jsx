import React, { useState, useRef } from "react";
import { FaMicrophone, FaMicrophoneSlash, FaPaperPlane } from "react-icons/fa";

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition || null;

const LANG_MAP = {
  es: "es-PE", qu: "qu-PE", ay: "ay-BO", en: "en-US", pt: "pt-BR"
};

export default function InputChatConMicrofonoPro({ idiomaActual = "es", onSend }) {
  const [input, setInput] = useState("");
  const [escuchando, setEscuchando] = useState(false);
  const recognitionRef = useRef(null);

  // --- WAVES ---
  function AudioWaves() {
    return (
      <svg width="34" height="26" viewBox="0 0 34 26" fill="none" className="mx-2">
        <g>
          <WaveBar delay={0} />
          <WaveBar delay={0.2} />
          <WaveBar delay={0.4} />
          <WaveBar delay={0.6} />
          <WaveBar delay={0.8} />
        </g>
      </svg>
    );
  }
  function WaveBar({ delay = 0 }) {
    // Genera un "wave" animado individual
    return (
      <rect
        x={6 * (delay * 5)}
        y="4"
        width="4"
        height="18"
        rx="2"
        fill="#b03a1a"
        style={{
          animation: `wave 1s ${delay}s infinite cubic-bezier(.4,.5,.5,1)`
        }}
      />
    );
  }

  // --- CSS KEYFRAMES para Waves ---
  // Inserta en tu index.css o tailwind.css:
  /*
  @keyframes wave {
    0%, 100% { height: 10px; y: 8; }
    20% { height: 20px; y: 2; }
    50% { height: 14px; y: 6; }
    80% { height: 24px; y: 0; }
  }
  */

  // --- SPEECH TO TEXT ---
  const langCode = LANG_MAP[idiomaActual] || "es-PE";

  const startListening = () => {
    if (!SpeechRecognition) {
      alert("El reconocimiento de voz no está disponible en este navegador.");
      return;
    }
    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.lang = langCode;
    recognition.interimResults = false;
    setEscuchando(true);

    recognition.onresult = event => {
      const texto = event.results[0][0].transcript;
      setInput(texto);
      setEscuchando(false);
    };
    recognition.onerror = () => setEscuchando(false);
    recognition.onend = () => setEscuchando(false);

    recognition.start();
  };

  const stopListening = () => {
    recognitionRef.current?.stop();
    setEscuchando(false);
  };

  const handleInputKeyDown = (e) => {
    if (e.key === "Enter" && !escuchando && input.trim()) {
      onSend(input);
      setInput("");
    }
  };

  return (
    <div className="flex gap-2 items-center w-full">
      <div className="relative flex-1 flex items-center">
        <input
          className="w-full rounded-lg border px-4 py-2 text-base focus:outline-[#b03a1a]"
          type="text"
          placeholder="Escribe o dicta tu mensaje..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleInputKeyDown}
          disabled={escuchando}
        />
        {/* WAVES ANIMADOS */}
        {escuchando && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none z-10">
            <AudioWaves />
          </div>
        )}
      </div>
      <button
        className={`rounded-full p-2 transition border-2 ${escuchando ? "border-[#b03a1a] bg-[#ffeaea]" : "border-gray-200 bg-gray-50"}`}
        title={escuchando ? "Detener dictado" : "Dictar por voz"}
        onClick={escuchando ? stopListening : startListening}
        style={{ outline: "none" }}
      >
        {escuchando ? <FaMicrophoneSlash color="#b03a1a" /> : <FaMicrophone color="#1662c4" />}
      </button>
      <button
        className="rounded-full p-2 bg-[#b03a1a] hover:bg-[#e5540c] transition"
        title="Enviar"
        onClick={() => { onSend(input); setInput(""); }}
        disabled={!input.trim() || escuchando}
        style={{ outline: "none" }}
      >
        <FaPaperPlane color="white" />
      </button>
    </div>
  );
}
