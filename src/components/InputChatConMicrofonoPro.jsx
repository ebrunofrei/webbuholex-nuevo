import React, { useState, useRef } from "react";
import {
  FaMicrophone,
  FaMicrophoneSlash,
  FaPaperPlane,
} from "react-icons/fa";

// ---- SpeechRecognition nativo del navegador ----
const SpeechRecognition =
  window.SpeechRecognition || window.webkitSpeechRecognition || null;

// ---- Mapeo de idiomas reconocidos ----
const LANG_MAP = {
  es: "es-PE",
  qu: "qu-PE",
  ay: "ay-BO",
  en: "en-US",
  pt: "pt-BR",
};

/**
 * Componente de input con:
 * - dictado de voz (web speech API)
 * - textarea responsive (crece hasta cierto alto)
 * - botones táctiles XL para mobile/tablet
 *
 * Props:
 *   idiomaActual: "es" | "qu" | ...
 *   onSend: (texto: string) => void   // lo maneja el padre
 */
export default function InputChatConMicrofonoPro({
  idiomaActual = "es",
  onSend,
}) {
  const [input, setInput] = useState("");
  const [escuchando, setEscuchando] = useState(false);
  const recognitionRef = useRef(null);

  // idioma STT
  const langCode = LANG_MAP[idiomaActual] || "es-PE";

  // =========================================================
  // Ondas animadas (visual de "grabando...")
  // =========================================================
  function AudioWaves() {
    return (
      <div className="flex items-center gap-2">
        <span className="text-[11px] font-semibold text-[#b03a1a] hidden sm:inline">
          Grabando…
        </span>
        <svg
          width="34"
          height="26"
          viewBox="0 0 34 26"
          fill="none"
          className="mx-1"
        >
          <g>
            <WaveBar delay={0} />
            <WaveBar delay={0.2} />
            <WaveBar delay={0.4} />
            <WaveBar delay={0.6} />
            <WaveBar delay={0.8} />
          </g>
        </svg>
      </div>
    );
  }

  function WaveBar({ delay = 0 }) {
    // cada barra se desplaza un poco con delay
    return (
      <rect
        x={6 * (delay * 5)}
        y="4"
        width="4"
        height="18"
        rx="2"
        fill="#b03a1a"
        style={{
          animation: `wave 1s ${delay}s infinite cubic-bezier(.4,.5,.5,1)`,
        }}
      />
    );
  }

  // =========================================================
  // Speech-to-text
  // =========================================================
  const startListening = () => {
    if (!SpeechRecognition) {
      alert(
        "El reconocimiento de voz no está disponible en este navegador. Prueba con Chrome o Android."
      );
      return;
    }

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;

    recognition.lang = langCode;
    recognition.interimResults = false;

    setEscuchando(true);

    recognition.onresult = (event) => {
      const texto = event.results?.[0]?.[0]?.transcript ?? "";
      // añadimos el texto capturado al input actual (en vez de sobrescribirlo)
      setInput((prev) =>
        prev
          ? prev.trim() + " " + texto.trim()
          : texto.trim()
      );
      setEscuchando(false);
    };

    recognition.onerror = () => {
      setEscuchando(false);
    };

    recognition.onend = () => {
      // si terminó (usuario dejó de hablar o cortó)
      setEscuchando(false);
    };

    recognition.start();
  };

  const stopListening = () => {
    recognitionRef.current?.stop();
    setEscuchando(false);
  };

  // =========================================================
  // Envío (Enter / botón avioncito)
  // =========================================================
  function enviar() {
    const limpio = input.trim();
    if (!limpio || escuchando) return;
    onSend?.(limpio);
    setInput("");
  }

  const handleKeyDown = (e) => {
    // Enter = enviar, Shift+Enter = salto de línea
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      enviar();
    }
  };

  // =========================================================
  // UI
  // =========================================================
  return (
    <div
      className="
        w-full
        flex flex-col
        bg-white
        border-t border-yellow-300
        shadow-[0_-4px_20px_#0002]
        px-3 py-2 sm:px-4 sm:py-3
        sticky bottom-0 z-[60]
      "
    >
      <div
        className="
          flex items-end gap-2 w-full max-w-full
          sm:max-w-3xl md:max-w-4xl
          mx-auto
        "
      >
        {/* CAMPO DE TEXTO (textarea adaptable) */}
        <div className="relative flex-1 flex flex-col">
          <textarea
            className={`
              w-full
              text-[#5C2E0B]
              bg-white
              rounded-xl
              border border-yellow-300
              px-3 pr-10 py-2
              text-[15px] sm:text-[15px] md:text-[16px]
              leading-relaxed
              resize-none
              focus:outline-none focus:ring-2 focus:ring-yellow-400
            `}
            rows={1}
            style={{
              minHeight: 44, // cómodo para el pulgar en móvil
              maxHeight: 140,
              overflowY: "auto",
              wordBreak: "break-word",
              whiteSpace: "pre-wrap",
            }}
            placeholder="Escribe o dicta tu mensaje legal…"
            disabled={escuchando}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
          />

          {/* indicador de grabación (ondas) pegado al borde derecho del textarea */}
          {escuchando && (
            <div
              className="
                absolute right-2 bottom-2
                bg-[#fff5f5] border border-[#b03a1a]/30
                rounded-lg px-2 py-[2px]
                flex items-center
              "
            >
              <AudioWaves />
            </div>
          )}
        </div>

        {/* BOTÓN MICRO / STOP */}
        <button
          type="button"
          className={`
            flex-shrink-0
            rounded-full
            border-2
            transition
            flex items-center justify-center
          ${
            escuchando
              ? "border-[#b03a1a] bg-[#ffeaea]"
              : "border-yellow-300 bg-yellow-50 hover:bg-yellow-100"
          }
          `}
          style={{
            width: 44,
            height: 44,
            minWidth: 44,
            minHeight: 44,
            outline: "none",
          }}
          title={escuchando ? "Detener dictado" : "Dictar por voz"}
          onClick={escuchando ? stopListening : startListening}
          disabled={false}
        >
          {escuchando ? (
            <FaMicrophoneSlash color="#b03a1a" size={18} />
          ) : (
            <FaMicrophone color="#5C2E0B" size={18} />
          )}
        </button>

        {/* BOTÓN ENVIAR */}
        <button
          type="button"
          className={`
            flex-shrink-0
            rounded-full
            flex items-center justify-center
            transition
            text-white font-semibold
            ${
              !input.trim() || escuchando
                ? "bg-[#bcbcbc] cursor-not-allowed"
                : "bg-[#5C2E0B] hover:bg-[#8b4e18]"
            }
          `}
          style={{
            width: 46,
            height: 46,
            minWidth: 46,
            minHeight: 46,
            outline: "none",
          }}
          title="Enviar"
          onClick={enviar}
          disabled={!input.trim() || escuchando}
        >
          <FaPaperPlane size={18} />
        </button>
      </div>

      {/* NOTA PEQUEÑA / AYUDA */}
      <div className="text-[11px] text-center text-[#5C2E0B] mt-2 opacity-80 leading-tight">
        <span className="hidden sm:inline">
          Enter para enviar · Shift+Enter para salto de línea ·
        </span>{" "}
        Dictado soporta español Perú, quechua, aymara y más 🌐
      </div>
    </div>
  );
}

/* 
⚠️ IMPORTANTE: añade estos keyframes en tu CSS global (por ejemplo src/index.css o tailwind.css global)

@keyframes wave {
  0%, 100% { height: 10px; y: 8; }
  20%      { height: 20px; y: 2; }
  50%      { height: 14px; y: 6; }
  80%      { height: 24px; y: 0; }
}

- esto anima las barritas rojas durante la grabación
- si ya los tienes definidos, no dupliques
*/
