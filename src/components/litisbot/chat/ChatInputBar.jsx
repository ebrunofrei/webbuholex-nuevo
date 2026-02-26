// ============================================================================
// ✍️ ChatInputBar — Enterprise Legal Composer (FIXED)
// ============================================================================

import React, { useRef, useState, useEffect, useCallback } from "react";
import {
  Paperclip,
  Send,
  Mic,
  StopCircle,
  Plus,
  X,
  FileText,
  Image as ImageIcon,
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
  onRemoveAttachment,
  onOpenTools,
  cargando = false,
  disabledSend = false,
  cognitiveMode = "consulta",
  botState = "idle",
}) {
  const textareaRef = useRef(null);
  const fileRef = useRef(null);
  const recognitionRef = useRef(null);

  // 🔑 Soporte híbrido (controlado o interno)
  const [internalValue, setInternalValue] = useState("");
  const texto = value !== undefined ? value : internalValue;

  const [recording, setRecording] = useState(false);
  const [focused, setFocused] = useState(false);

  const cognitive = useCognitiveInput({
    mode: cognitiveMode,
    botState,
  });

  // ------------------------------------------------------------
  // Auto resize
  // ------------------------------------------------------------
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 180) + "px";
  }, [texto, adjuntos]);

  const updateText = (v) => {
    if (value === undefined) {
      setInternalValue(v);
    }
    onChange?.(v);
  };

  // ------------------------------------------------------------
  // Enviar
  // ------------------------------------------------------------
  const handleSend = useCallback(() => {
    if (cargando || disabledSend) return;
    if (!texto.trim() && adjuntos.length === 0) return;

    onSend?.(texto, adjuntos);

    // 🔑 limpiar correctamente
    if (value === undefined) {
      setInternalValue("");
    } else {
      onChange?.("");
    }
  }, [texto, adjuntos, cargando, disabledSend, onSend, value, onChange]);

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // ------------------------------------------------------------
  // Adjuntar
  // ------------------------------------------------------------
  const attachFiles = (files) => {
    const valid = Array.from(files || []).filter(
      (f) => f.size <= MAX_MB * 1024 * 1024
    );
    if (valid.length) onAttachFiles?.(valid);
  };

  // ------------------------------------------------------------
  // Dictado
  // ------------------------------------------------------------
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

  const AttachmentBadge = ({ file, index }) => (
    <div className="flex items-center gap-2 border border-neutral-200 rounded-md px-2 py-1">
      {file.type.includes("image") ? (
        <ImageIcon size={14} />
      ) : (
        <FileText size={14} />
      )}
      <span className="text-xs text-neutral-600 truncate max-w-[140px]">
        {file.name}
      </span>
      <button
        onClick={() => onRemoveAttachment?.(index)}
        className="text-neutral-400 hover:text-neutral-600 transition"
      >
        <X size={14} />
      </button>
    </div>
  );

  return (
    <div className="border-t border-neutral-200 bg-white">
      <div className="mx-auto w-full max-w-3xl px-6 py-6">

        <div
          className={`
            flex flex-col
            border border-neutral-300
            rounded-lg
            bg-white
            ${focused ? "border-neutral-400" : ""}
          `}
        >
          {adjuntos.length > 0 && (
            <div className="flex flex-wrap gap-2 px-4 pt-3 pb-1">
              {adjuntos.map((item, i) => (
                <AttachmentBadge key={i} file={item} index={i} />
              ))}
            </div>
          )}

          <div className="flex items-end px-3 py-2">

            <div className="flex items-center">
              <button
                onClick={() => onOpenTools?.()}
                className="p-2 text-neutral-500 hover:text-neutral-700 transition"
              >
                <Plus size={18} />
              </button>

              <button
                onClick={() => fileRef.current?.click()}
                className="p-2 text-neutral-500 hover:text-neutral-700 transition"
              >
                <Paperclip size={18} />
              </button>
            </div>

            <textarea
              ref={textareaRef}
              rows={1}
              value={texto}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              onChange={(e) => updateText(e.target.value)}
              onKeyDown={handleKey}
              placeholder={
                cognitive.placeholder ||
                "Formule su análisis jurídico con precisión conceptual…"
              }
              className="
                flex-1 resize-none bg-transparent outline-none
                px-3 py-2
                text-[16px] leading-7 text-neutral-900
                placeholder:text-neutral-400
              "
            />

            <div className="flex items-center gap-1">
              <button
                onClick={recording ? stopRecording : startRecording}
                className="p-2 text-neutral-500 hover:text-neutral-700 transition"
              >
                {recording ? (
                  <StopCircle size={18} />
                ) : (
                  <Mic size={18} />
                )}
              </button>

              <button
                onClick={handleSend}
                disabled={
                  cargando ||
                  disabledSend ||
                  (!texto.trim() && adjuntos.length === 0)
                }
                className="
                  p-2
                  text-neutral-600
                  hover:text-black
                  disabled:opacity-30
                  transition
                "
              >
                <Send size={18} />
              </button>
            </div>
          </div>
        </div>

        <div className="mt-3">
          <InputCognitiveHint label={cognitive.hint} />
        </div>
      </div>

      <input
        ref={fileRef}
        type="file"
        multiple
        accept=".pdf,.doc,.docx,.txt,image/*"
        onChange={(e) => {
          attachFiles(e.target.files);
          e.target.value = "";
        }}
        className="hidden"
      />
    </div>
  );
}