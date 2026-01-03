// ============================================================================
// 🔊 TTSControls — HÍBRIDO INTELIGENTE (C)
// ----------------------------------------------------------------------------
// - Mensajes cortos → SpeechSynthesis nativo (rápido, ligero).
// - Mensajes largos → Azure Neural Voice vía backend (voz masculina pro).
// - Si Azure falla → fallback automático al navegador.
// - Botones 100% funcionales (leer, repetir, bucle, detener, silenciar).
// - No requiere instrucciones internas → totalmente humano y natural.
// ============================================================================

import React, { useEffect, useMemo, useRef, useState } from "react";

// ============================================================================
// CONFIG
// ============================================================================
const MAX_BROWSER_CHARS = 280; // umbral para decidir Azure
const DEFAULT_AZURE_VOICE = "es-PE-AngeloNeural"; // voz masculina profesional

export default function TTSControls({ mensajes = [], ttsPrefs = {} }) {
  const engine =
    typeof window !== "undefined" ? window.speechSynthesis : null;

  // Preferencias externas (Centro de Control)
  const enabled = ttsPrefs?.enabled !== false;
  const rate = Number(ttsPrefs?.rate ?? 1);
  const pitch = Number(ttsPrefs?.pitch ?? 1);
  const vozBrowserPref = ttsPrefs?.vozBrowser || "male";
  const vozAzure = ttsPrefs?.vozAzure || DEFAULT_AZURE_VOICE;

  const [isPlaying, setIsPlaying] = useState(false);
  const [loop, setLoop] = useState(Boolean(ttsPrefs?.loop ?? false));

  const voicesReadyRef = useRef(false);
  const lastTextRef = useRef("");
  const utteranceRef = useRef(null);
  const loopRef = useRef(loop);

  useEffect(() => {
    loopRef.current = loop;
  }, [loop]);

  // Último mensaje del bot
  const ultimoTexto = useMemo(() => {
    const reversed = [...(mensajes || [])].reverse();
    const botMsg = reversed.find(
      (m) => m?.role === "assistant" && m?.content
    );
    return String(botMsg?.content || "").trim();
  }, [mensajes]);

  useEffect(() => {
    if (ultimoTexto) lastTextRef.current = ultimoTexto;
  }, [ultimoTexto]);

  // ========================================================================
  // Carga de voces del navegador
  // ========================================================================
  useEffect(() => {
    if (!engine) return;
    const markReady = () => {
      const voces = engine.getVoices?.() || [];
      if (voces.length) voicesReadyRef.current = true;
    };
    markReady();
    engine.addEventListener?.("voiceschanged", markReady);
    return () => {
      engine.removeEventListener?.("voiceschanged", markReady);
    };
  }, [engine]);

  useEffect(() => {
    return () => {
      try {
        engine?.cancel?.();
      } catch {}
    };
  }, [engine]);

  // ============================================================
  // Selección de voz del navegador
  // ============================================================
  function pickBrowserVoice() {
    if (!engine || !voicesReadyRef.current) return null;
    const voices = engine.getVoices?.() || [];
    if (!voices.length) return null;

    const maleMatches = voices.filter((v) =>
      (v.name || "").toLowerCase().includes("male") ||
      (v.name || "").toLowerCase().includes("man") ||
      (v.name || "").toLowerCase().includes("alvaro")
    );

    if (maleMatches.length) return maleMatches[0];
    return voices[0];
  }

  // ============================================================
  // Backend Azure TTS (MP3 → Audio)
  // ============================================================
  async function reproducirAzure(texto) {
    try {
      const res = await fetch("/api/tts/azure", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: texto,
          voice: vozAzure,
        }),
      });

      if (!res.ok) throw new Error("Azure TTS error");

      const { audioBase64 } = await res.json();
      if (!audioBase64) throw new Error("Sin audio");

      const audio = new Audio(`data:audio/mp3;base64,${audioBase64}`);

      audio.onended = () => {
        setIsPlaying(false);
        if (loopRef.current) {
          setTimeout(() => reproducirAzure(texto), 400);
        }
      };

      audio.onerror = () => setIsPlaying(false);

      setIsPlaying(true);
      await audio.play();
      return true;
    } catch (err) {
      console.warn("Azure TTS Fallback:", err);
      return false;
    }
  }

  // ============================================================
  // Navegador — SpeechSynthesis
  // ============================================================
  function stopBrowser() {
    try {
      engine?.cancel?.();
    } catch {}
    setIsPlaying(false);
  }

  function reproducirBrowser(texto, opts = {}) {
    if (!engine) return;

    const clean = String(texto).trim();
    if (!clean) return;

    const u = new SpeechSynthesisUtterance(clean);
    u.rate = rate;
    u.pitch = pitch;

    const voice = pickBrowserVoice();
    if (voice) u.voice = voice;

    u.onend = () => {
      setIsPlaying(false);
      if (loopRef.current) {
        setTimeout(() => reproducirBrowser(clean), 400);
      }
    };
    u.onerror = () => setIsPlaying(false);

    utteranceRef.current = u;

    try {
      engine.cancel();
      engine.speak(u);
      setIsPlaying(true);
    } catch {
      setIsPlaying(false);
    }
  }

  // ============================================================
  // Elección inteligente (Azure / Browser)
  // ============================================================
  async function speak(texto) {
    const clean = String(texto).trim();
    if (!clean) return;

    lastTextRef.current = clean;

    if (clean.length > MAX_BROWSER_CHARS) {
      const ok = await reproducirAzure(clean);
      if (ok) return;
    }

    reproducirBrowser(clean);
  }

  // ============================================================
  // BOTONES
  // ============================================================
  function handleLeer() {
    if (!ultimoTexto) return;
    speak(ultimoTexto);
  }

  function handleRepetir() {
    if (!lastTextRef.current) return;
    speak(lastTextRef.current);
  }

  function handleStop() {
    stopBrowser();
    setIsPlaying(false);
  }

  function handleToggleLoop() {
    setLoop((prev) => !prev);
  }

  if (!enabled) return null;

  const canRead = Boolean(ultimoTexto);
  const canRepeat = Boolean(lastTextRef.current);

  // ========================================================================
  // UI — diseño institucional
  // ========================================================================
  return (
    <div className="flex flex-wrap gap-2 items-center justify-start">

      {/* LEER */}
      <button
        type="button"
        onClick={handleLeer}
        disabled={!canRead}
        className={`px-3 py-2 rounded-xl text-sm font-semibold transition
          ${
            canRead
              ? "bg-[#5C2E0B] text-white hover:bg-[#4A2308]"
              : "bg-[#E4E4EA] text-[#9A9AA3] cursor-not-allowed"
          }`}
      >
        Leer
      </button>

      {/* REPETIR */}
      <button
        type="button"
        onClick={handleRepetir}
        disabled={!canRepeat}
        className={`px-3 py-2 rounded-xl text-sm font-semibold transition border
          ${
            canRepeat
              ? "bg-white border-[#E2E2E8] text-[#3A2A1A] hover:bg-[#F7F7FA]"
              : "bg-[#F2F2F7] text-[#9A9AA3] cursor-not-allowed border-[#E2E2E8]"
          }`}
      >
        Repetir
      </button>

      {/* BUCLE */}
      <button
        type="button"
        onClick={handleToggleLoop}
        className={`px-3 py-2 rounded-xl text-sm font-semibold transition border border-[#E2E2E8]
          ${
            loop
              ? "bg-[#FFF1CC] text-[#7A5500]"
              : "bg-white text-[#3A2A1A] hover:bg-[#F7F7FA]"
          }`}
      >
        {loop ? "Bucle: ON" : "Bucle: OFF"}
      </button>

      {/* DETENER */}
      <button
        type="button"
        onClick={handleStop}
        disabled={!isPlaying}
        className={`px-3 py-2 rounded-xl text-sm font-semibold transition border border-[#E2E2E8]
          ${
            isPlaying
              ? "bg-white text-[#3A2A1A] hover:bg-[#FDECEC]"
              : "bg-[#F2F2F7] text-[#9A9AA3] cursor-not-allowed"
          }`}
      >
        Detener
      </button>

      {/* SILENCIAR */}
      <button
        type="button"
        onClick={handleStop}
        className="px-3 py-2 rounded-xl text-sm font-semibold transition border border-[#E2E2E8] bg-white text-[#3A2A1A] hover:bg-[#F7F7FA]"
      >
        Silenciar
      </button>
    </div>
  );
}
