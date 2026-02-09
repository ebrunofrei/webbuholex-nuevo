import { useRef, useState, useEffect } from "react";
import { MdSend, MdAttachFile } from "react-icons/md";
import { useGeneralChatContext } from "./GeneralChatProvider";

/* ============================================================================
   R7.7+++ — GENERAL CHAT INPUT (MOBILE CANONICAL)
   ----------------------------------------------------------------------------
   GOALS:
   - No zombie state
   - No keyboard blur hacks
   - Mobile IME safe
   - Button NEVER depends on async network state
============================================================================ */

export default function GeneralChatInput() {
  const { dispatchMessage, isDispatching } = useGeneralChatContext();

  // 🔑 Estado LOCAL del input (NO dependemos del provider)
  const [value, setValue] = useState("");

  const textareaRef = useRef(null);
  const isComposingRef = useRef(false);

  // ---------------------------------------------------------------------------
  // Auto-resize estable (mobile safe)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;

    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);

  // ---------------------------------------------------------------------------
  // Envío CANÓNICO
  // ---------------------------------------------------------------------------
  const handleSend = () => {
    const text = value.trim();
    if (!text) return;

    // 1️⃣ Limpieza inmediata → UX fluida
    setValue("");

    // 2️⃣ Envío desacoplado de la UI (NO await)
    dispatchMessage(text);
  };

  // ⚠️ OJO: el botón NO depende de isDispatching
  const canSend = value.trim().length > 0;

  return (
    <div className="bg-white border-t border-slate-100 px-4 py-4 safe-bottom">
      <div className="mx-auto w-full max-w-4xl">
        <div
          className="
            flex items-end gap-3 rounded-2xl border px-4 py-3
            bg-white border-slate-200
            focus-within:border-slate-900
            transition-all
          "
        >
          {/* Adjuntar (pasivo) */}
          <button
            type="button"
            tabIndex={-1}
            className="text-slate-400 p-1 mb-1"
          >
            <MdAttachFile size={22} />
          </button>

          {/* TEXTAREA */}
          <textarea
            ref={textareaRef}
            value={value}
            rows={1}
            placeholder="Introduce los hechos o fundamentos de tu consulta…"
            enterKeyHint="send"
            className="
              flex-1 resize-none bg-transparent
              text-[16px] leading-relaxed
              outline-none text-slate-800
              placeholder:text-slate-400
            "
            onChange={(e) => setValue(e.target.value)}
            onCompositionStart={() => {
              isComposingRef.current = true;
            }}
            onCompositionEnd={(e) => {
              isComposingRef.current = false;
              setValue(e.target.value);
            }}
            onKeyDown={(e) => {
              if (
                e.key === "Enter" &&
                !e.shiftKey &&
                !isComposingRef.current
              ) {
                e.preventDefault();
                handleSend();
              }
            }}
          />

          {/* SEND */}
          <button
            type="button"
            onClick={handleSend}
            disabled={!canSend}
            className={`
              h-11 w-11 flex items-center justify-center
              rounded-xl transition-all
              ${
                canSend
                  ? "bg-slate-900 text-white active:scale-95"
                  : "bg-slate-100 text-slate-300"
              }
            `}
          >
            {isDispatching ? (
              <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            ) : (
              <MdSend size={22} />
            )}
          </button>
        </div>

        {/* META */}
        <div className="flex justify-between items-center px-2 mt-3 select-none">
          <span className="text-[9px] font-black text-slate-300 uppercase tracking-[0.3em]">
            BúhoLex LegalTech
          </span>
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
            Home Chat · R7.7
          </span>
        </div>
      </div>
    </div>
  );
}
