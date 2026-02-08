import React, { useEffect, useMemo, useRef, useState } from "react";
import { Play, Pause } from "lucide-react";
import BotMessageRenderer from "@/components/litisbot/chat/ui/BotMessageRenderer.jsx";

const MAX_CHARS_PREVIEW = 900;
const MAX_BROWSER_CHARS = 280;
const AZURE_VOICE = "es-PE-AngeloNeural";

export default function MensajeBotBubble({ msg }) {
  /* ===================== STATE (ORDEN FIJO) ===================== */
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [stableText, setStableText] = useState("");
  const [ttsState, setTtsState] = useState("idle");

  /* ===================== REFS ===================== */
  const utteranceRef = useRef(null);
  const audioRef = useRef(null);

  /* ===================== CONTEXTO DE TURNO ===================== */
  const turnContext = msg?.meta?.turnContext;

  /* ===================== CONGELAR TEXTO POR TURNO ===================== */
  useEffect(() => {
    if (typeof msg?.content === "string") {
      setStableText(msg.content);
    }
  }, [msg?.content]);

  /* ===================== RESET CONTROLADO ===================== */
  useEffect(() => {
    if (turnContext?.analysisReset) {
      setExpanded(false);
      setCopied(false);
    }
  }, [turnContext?.analysisReset]);

  /* ===================== DERIVADOS ===================== */
  const rawText = stableText || "";

  const isThinking =
    msg?._placeholder ||
    msg?.loading ||
    (!rawText.trim() && msg?.role === "assistant");

  const isLong = rawText.length > MAX_CHARS_PREVIEW;

  const visibleText = useMemo(() => {
    if (!isLong || expanded) return rawText;
    return rawText.slice(0, MAX_CHARS_PREVIEW) + "…";
  }, [rawText, isLong, expanded]);

  /* ===================== TTS ===================== */
  async function playTTS() {
    if (!rawText.trim()) return;

    if (rawText.length > MAX_BROWSER_CHARS) {
      const res = await fetch("/api/tts/azure", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: rawText, voice: AZURE_VOICE }),
      });
      const { audioBase64 } = await res.json();
      const audio = new Audio(`data:audio/mp3;base64,${audioBase64}`);
      audioRef.current = audio;
      audio.onended = () => setTtsState("idle");
      audio.play();
      setTtsState("playing");
      return;
    }

    const u = new SpeechSynthesisUtterance(rawText);
    u.lang = "es-PE";
    u.onend = () => setTtsState("idle");
    utteranceRef.current = u;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
    setTtsState("playing");
  }

  /* ===================== RENDER ===================== */
  if (isThinking) {
    return (
      <div className="flex justify-start mb-8">
        <div className="px-6 py-5 rounded-2xl bg-white/70 text-black/60 italic">
          Analizando…
        </div>
      </div>
    );
  }

  if (!rawText.trim()) return null;

  return (
    <div className="flex justify-start mb-10">
      <div className="max-w-[760px] w-full px-8 py-7 rounded-2xl bg-white shadow-md border">

        <div className="prose max-w-none text-[18.5px] leading-[1.85]">
          <BotMessageRenderer content={visibleText} />
        </div>

        {isLong && (
          <div className="mt-4 text-sm text-black/50">
            <button onClick={() => setExpanded(v => !v)} className="underline">
              {expanded ? "Mostrar menos" : "Mostrar más"}
            </button>
          </div>
        )}

        <div className="mt-6 flex justify-between text-xs text-black/40">
          <div className="flex gap-2">
            {ttsState === "idle" && (
              <button onClick={playTTS}><Play size={18} /></button>
            )}
            {ttsState === "playing" && (
              <button onClick={() => setTtsState("idle")}><Pause size={18} /></button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
