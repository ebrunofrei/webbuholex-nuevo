// ============================================================================
// 🧠 MensajeBotBubble — Criterio jurídico profesional + TTS por bloque
// ----------------------------------------------------------------------------
// - Render limpio del mensaje
// - Compatible Markdown / Word
// - TTS individual por mensaje (NO global)
// - Controles mínimos: Iniciar / Pausar / Reanudar
// - Híbrido: Browser ↔ Azure con fallback
// ============================================================================

import React, { useMemo, useRef, useState } from "react";
import { Copy, Check, Play, Pause } from "lucide-react";
import BotMessageRenderer from "@/components/litisbot/chat/ui/BotMessageRenderer.jsx";

const MAX_CHARS_PREVIEW = 900;
const MAX_BROWSER_CHARS = 280;
const AZURE_VOICE = "es-PE-AngeloNeural";

export default function MensajeBotBubble({ msg, modoSalida = "markdown" }) {
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const [ttsState, setTtsState] = useState("idle"); // idle | playing | paused
  const utteranceRef = useRef(null);
  const audioRef = useRef(null);

  const texto = msg?.content || "";
  const isThinking = msg?._placeholder || msg?.loading;

  /* ===============================
     Loader
  =============================== */
  if (isThinking) {
    return (
      <div className="flex justify-start mb-8">
        <div className="px-6 py-5 rounded-2xl bg-white/60 text-black/60 italic animate-pulse">
          Procesando…
        </div>
      </div>
    );
  }

  if (!texto.trim()) return null;

  const isLong = texto.length > MAX_CHARS_PREVIEW;
  const visibleText =
    !expanded && isLong ? texto.slice(0, MAX_CHARS_PREVIEW) + "…" : texto;

  /* ===============================
     Normalización Word
  =============================== */
  const wordFormatted = useMemo(() => {
    if (modoSalida !== "word") return visibleText;

    return visibleText
      .replace(/^#{1,6}\s*/gm, "")
      .replace(/\*\*(.*?)\*\*/g, "$1")
      .replace(/`([^`]*)`/g, "$1")
      .replace(/^- /gm, "• ")
      .trim();
  }, [visibleText, modoSalida]);

  /* ===============================
     COPY
  =============================== */
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(texto);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {}
  };

  /* ===============================
     TTS — CORE
  =============================== */
  async function playTTS() {
    if (!texto.trim()) return;

    // Azure para textos largos
    if (texto.length > MAX_BROWSER_CHARS) {
      try {
        const res = await fetch("/api/tts/azure", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: texto,
            voice: AZURE_VOICE,
          }),
        });

        if (!res.ok) throw new Error("Azure error");

        const { audioBase64 } = await res.json();
        const audio = new Audio(`data:audio/mp3;base64,${audioBase64}`);
        audioRef.current = audio;

        audio.onended = () => setTtsState("idle");
        audio.play();
        setTtsState("playing");
        return;
      } catch {
        // fallback a browser
      }
    }

    // Browser TTS
    const u = new SpeechSynthesisUtterance(texto);
    u.lang = "es-PE";
    u.onend = () => setTtsState("idle");

    utteranceRef.current = u;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
    setTtsState("playing");
  }

  function pauseTTS() {
    if (audioRef.current) {
      audioRef.current.pause();
    } else {
      window.speechSynthesis.pause();
    }
    setTtsState("paused");
  }

  function resumeTTS() {
    if (audioRef.current) {
      audioRef.current.play();
    } else {
      window.speechSynthesis.resume();
    }
    setTtsState("playing");
  }

  /* ===============================
     RENDER
  =============================== */
  return (
    <div className="flex justify-start mb-10">
      <div className="max-w-[760px] w-full px-8 py-7 rounded-2xl bg-white text-black shadow-md border border-black/10">

        {/* CONTENIDO */}
        <div className="space-y-5">
          <div className="text-[19px] leading-[1.75]">
            <BotMessageRenderer
              content={modoSalida === "word" ? wordFormatted : visibleText}
            />
          </div>
        </div>

        {/* MOSTRAR MÁS */}
        {isLong && (
          <div className="mt-3 text-sm text-black/50">
            <button onClick={() => setExpanded(v => !v)} className="underline">
              {expanded ? "Mostrar menos" : "Mostrar más"}
            </button>
          </div>
        )}

        {/* ACCIONES */}
        <div className="mt-6 flex justify-between items-center text-[12px] text-black/40">

          {/* TTS POR BLOQUE */}
          <div className="flex gap-2">
            {ttsState === "idle" && (
              <button onClick={playTTS} title="Leer">
                <Play size={18} />
              </button>
            )}

            {ttsState === "playing" && (
              <button onClick={pauseTTS} title="Pausar">
                <Pause size={18} />
              </button>
            )}

            {ttsState === "paused" && (
              <button onClick={resumeTTS} title="Reanudar">
                <Play size={18} />
              </button>
            )}
          </div>

          {/* COPY */}
          <button onClick={handleCopy} className="flex gap-1 hover:text-black">
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copied ? "Copiado" : "Copiar"}
          </button>
        </div>
      </div>
    </div>
  );
}
