// ============================================================================
// 🗣️ InterpreteJuridicoMultilingue — MOBILE FIRST (CANÓNICO)
// ----------------------------------------------------------------------------
// - Reemplaza todo el chat en móvil
// - Pantalla completa
// - Voz → Texto → Traducción → Voz (manual)
// - Repetir traducción sin volver a grabar
// - Feedback auditivo: escuchando / procesando / error
// - NO toca sesiones ni engine
// - NO inserta contenido en el chat
// ============================================================================

import React, { useState, useRef, useEffect } from "react";
import { Mic, X } from "lucide-react";
import TTSControls from "@/components/ui/TTSControls.jsx";
import { INTERPRETER_LANGUAGES } from "./interpreterLanguages.js";

// 🔊 cues auditivos institucionales
function playCue(src, volume = 0.4) {
  try {
    const audio = new Audio(src);
    audio.volume = volume;
    audio.play();
  } catch {}
}

// 🎛️ Modo por defecto (oral, inclusivo)
const DEFAULT_MODE = "audiencia";

export default function InterpreteJuridicoMultilingue({
  sessionId,
  onClose,
}) {
  const [listening, setListening] = useState(false);
  const [translatedText, setTranslatedText] = useState("");
  const [sourceLang, setSourceLang] = useState("auto");
  const [targetLang, setTargetLang] = useState("es");
  const [loading, setLoading] = useState(false);

  const mediaRecorderRef = useRef(null);

  // 🛑 Cancelación segura al desmontar
  useEffect(() => {
    return () => {
      try {
        mediaRecorderRef.current?.stop?.();
      } catch {}
    };
  }, []);

  // ======================================================
  // 🎙️ GRABACIÓN
  // ======================================================
  async function startRecording() {
    playCue("/audio/mic-on.mp3", 0.4);

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const recorder = new MediaRecorder(stream);
    mediaRecorderRef.current = recorder;

    const chunks = [];
    recorder.ondataavailable = (e) => chunks.push(e.data);

    recorder.onstop = async () => {
      setLoading(true);
      playCue("/audio/processing.mp3", 0.3);

      const blob = new Blob(chunks, { type: "audio/webm" });
      const base64 = await blobToBase64(blob);

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 20000);

        const res = await fetch("/api/tools/interpret", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            inputType: "voice",
            audioBase64: base64,
            sessionId,
            mode: DEFAULT_MODE,
            sourceLang,
            targetLang,
          }),
        });

        clearTimeout(timeoutId);

        const data = await res.json();

        if (data?.ok) {
          setTranslatedText(
            data.normalizedText || data.translatedText || ""
          );
        } else {
          playCue("/audio/error.mp3", 0.4);
        }
      } catch {
        playCue("/audio/error.mp3", 0.4);
      } finally {
        setLoading(false);
      }
    };

    recorder.start();
    setListening(true);
  }

  function stopRecording() {
    try {
      mediaRecorderRef.current?.stop?.();
    } catch {}
    setListening(false);
  }

  // ======================================================
  // UI
  // ======================================================
  return (
    <div className="fixed inset-0 z-[9999] bg-white flex flex-col">
      
      {/* ================= HEADER ================= */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-black/10">
        <div>
          <div className="font-semibold text-sm">
            Intérprete jurídico multilingüe
          </div>
          <div className="text-xs opacity-60">
            Lenguas · Voz · Justicia
          </div>
        </div>

        <button
          onClick={() => {
            try {
              mediaRecorderRef.current?.stop?.();
            } catch {}
            setListening(false);
            setLoading(false);
            setTranslatedText("");
            onClose();
          }}
          className="p-2 rounded-full hover:bg-black/5"
          aria-label="Cerrar intérprete"
        >
          <X size={18} />
        </button>
      </header>

      {/* ================= BODY ================= */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 gap-6 text-center">

        {/* 🌍 SELECTOR DE IDIOMAS */}
        <div className="w-full max-w-sm flex gap-2">
          <select
            value={sourceLang}
            onChange={(e) => setSourceLang(e.target.value)}
            className="flex-1 px-3 py-2 rounded-lg border text-sm"
          >
            {INTERPRETER_LANGUAGES.map((l) => (
              <option key={l.code} value={l.code}>
                {l.label}
              </option>
            ))}
          </select>

          <span className="self-center text-sm opacity-60">→</span>

          <select
            value={targetLang}
            onChange={(e) => setTargetLang(e.target.value)}
            className="flex-1 px-3 py-2 rounded-lg border text-sm"
          >
            {INTERPRETER_LANGUAGES
              .filter((l) => l.code !== "auto")
              .map((l) => (
                <option key={l.code} value={l.code}>
                  {l.label}
                </option>
              ))}
          </select>
        </div>

        {/* ICONO CENTRAL */}
        <img
          src="/icons/icon-interprete-multilingue.png"
          alt="Intérprete jurídico"
          className="w-28 h-28"
        />

        {/* BOTÓN PRINCIPAL */}
        <button
          onClick={listening ? stopRecording : startRecording}
          className={`
            w-full max-w-sm
            flex items-center justify-center gap-2
            py-4 rounded-xl text-white font-medium
            transition
            ${listening ? "bg-red-600 animate-pulse" : "bg-[#5C2E0B]"}
          `}
        >
          <Mic size={20} />
          {listening ? "Escuchando…" : "Hablar y traducir"}
        </button>

        {loading && (
          <div className="text-sm opacity-60">
            Procesando interpretación…
          </div>
        )}
      </main>

      {/* ================= RESULTADO ================= */}
      {translatedText && (
        <section className="px-4 pb-4 flex flex-col gap-4">
          
          <div className="bg-[#F7F1EC] p-4 rounded-xl">
            <div className="text-xs opacity-60 mb-1">
              Traducción jurídica
            </div>
            <div className="text-sm leading-relaxed">
              {translatedText}
            </div>
          </div>

          {/* 🔊 VOZ (MANUAL, CONTROLADA) */}
          <TTSControls
            mensajes={[
              { role: "assistant", content: translatedText },
            ]}
            ttsPrefs={{
              enabled: true,
              rate: 0.9,
              pitch: 0.95,
              vozAzure: "es-PE-AngeloNeural",
            }}
          />
        </section>
      )}
    </div>
  );
}

// ======================================================
// Utils
// ======================================================
function blobToBase64(blob) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () =>
      resolve(reader.result.split(",")[1]);
    reader.readAsDataURL(blob);
  });
}
