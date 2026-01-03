// ============================================================================
// ✍️ ChatInputBar — Mesa de trabajo jurídica (CANÓNICO)
// ----------------------------------------------------------------------------
// - NO IA
// - NO lógica jurídica
// - Hardware puro de input
// - UN solo botón de adjuntar (documento / imagen / foto)
// - Dictado por voz como icono junto a ENVIAR
// - Herramientas PRO se abren externamente
// ============================================================================

import React, { useRef, useState, useEffect } from "react";
import {
  Paperclip,
  Send,
  Mic,
  StopCircle,
} from "lucide-react";

import { useCognitiveInput } from "@/components/litisbot/chat/hooks/useCognitiveInput";
import InputCognitiveHint from "@/components/litisbot/chat/ui/InputCognitiveHint";

const MAX_MB = 25;

export default function ChatInputBar({
  value,
  onChange,
  onSend,

  adjuntos = [],
  onAttachFiles,

  // 🔩 HARDWARE
  onOpenTools, // abre LitisBotToolsModal (PRO)

  cargando = false,
  disabledSend = false,

  cognitiveMode = "consulta",
  botState = "idle",
}) {
  const textareaRef = useRef(null);
  const fileRef = useRef(null);
  const recognitionRef = useRef(null);

  const [localValue, setLocalValue] = useState("");
  const texto = value !== undefined ? value : localValue;

  const [recording, setRecording] = useState(false);

  // 🧠 UX cognitiva (solo hints)
  const cognitive = useCognitiveInput({
    mode: cognitiveMode,
    botState,
  });

  // ============================================================
  // Auto resize textarea
  // ============================================================
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 220) + "px";
  }, [texto]);

  const updateText = (v) => {
    if (value === undefined) setLocalValue(v);
    onChange?.(v);
  };

  // ============================================================
  // 🚀 ENVIAR
  // ============================================================
  const handleSend = () => {
    if (cargando) return;
    if (disabledSend) return;
    if (!texto.trim() && adjuntos.length === 0) return;

    onSend?.(texto, adjuntos);

    if (value === undefined) setLocalValue("");
  };

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // ============================================================
  // 📎 ADJUNTAR (documento / imagen / foto)
  // ============================================================
  const attachFiles = (files) => {
    const valid = Array.from(files || []).filter(
      (f) => f.size <= MAX_MB * 1024 * 1024
    );
    if (valid.length) onAttachFiles?.(valid);
  };

  // ============================================================
  // 🎙️ DICTADO POR VOZ
  // ============================================================
  const startRecording = () => {
    if (!("webkitSpeechRecognition" in window)) return;

    const rec = new webkitSpeechRecognition();
    rec.lang = "es-PE";
    rec.interimResults = false;

    rec.onresult = (e) => {
      const t = e.results[0][0].transcript || "";
      updateText((texto || "") + " " + t);
    };

    rec.onend = () => setRecording(false);

    recognitionRef.current = rec;
    setRecording(true);
    rec.start();
  };

  const stopRecording = () => {
    recognitionRef.current?.stop();
    setRecording(false);
  };

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <div className="border-t border-black/10 dark:border-white/10 bg-white dark:bg-black">
      <div className="mx-auto w-full max-w-[900px] px-4 pt-4 pb-3">
        <div className="flex items-end gap-3 rounded-xl border border-black/20 dark:border-white/20 px-4 py-3">

          {/* 🧰 HERRAMIENTAS PRO */}
          <button
            onClick={() => onOpenTools?.()}
            className="p-2 rounded-lg text-black/70 dark:text-white/70"
            title="Herramientas PRO"
          >
            <span className="text-[18px]">+</span>
          </button>

          {/* 📎 ADJUNTAR */}
          <button
            onClick={() => fileRef.current?.click()}
            className="p-2 rounded-lg text-black/70 dark:text-white/70"
            title="Adjuntar documento o imagen"
          >
            <Paperclip size={20} />
          </button>

          {/* TEXTO */}
          <textarea
            ref={textareaRef}
            rows={2}
            value={texto}
            onChange={(e) => updateText(e.target.value)}
            onKeyDown={handleKey}
            placeholder={cognitive.placeholder}
            className="
              flex-1 resize-none bg-transparent outline-none
              text-[16px] leading-relaxed
            "
          />

          {/* 🎙️ DICTADO */}
          <button
            onClick={recording ? stopRecording : startRecording}
            className="
              p-2 rounded-lg
              text-black/70 dark:text-white/70
              hover:bg-black/5 dark:hover:bg-white/5
            "
            title={recording ? "Detener dictado" : "Dictar por voz"}
          >
            {recording ? <StopCircle size={18} /> : <Mic size={18} />}
          </button>

          {/* 🚀 ENVIAR */}
          <button
            onClick={handleSend}
            disabled={
              cargando ||
              disabledSend ||
              (!texto.trim() && adjuntos.length === 0)
            }
            className="
              p-2 rounded-lg
              bg-black text-white
              disabled:opacity-40
            "
            title="Enviar"
          >
            <Send size={18} />
          </button>
        </div>

        <InputCognitiveHint label={cognitive.hint} />
      </div>

      {/* INPUT FILE ÚNICO */}
      <input
        ref={fileRef}
        type="file"
        multiple
        accept="
          application/pdf,
          application/msword,
          application/vnd.openxmlformats-officedocument.wordprocessingml.document,
          text/plain,
          image/*"
        onChange={(e) => {
          attachFiles(e.target.files);
          e.target.value = "";
        }}
        className="hidden"
      />
    </div>
  );
}
