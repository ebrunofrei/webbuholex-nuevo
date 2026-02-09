import { useRef, useState, useEffect } from "react";

/* ============================================================================
   LITIS | BUBBLE INPUT — R7.7++ FINAL CANONICAL
   ---------------------------------------------------------------------------
   UX MODEL:
   - Desktop: Continuous chat (Messenger-like focus persistence)
   - Mobile: Safe blur to avoid keyboard zombie states
   - Hybrid behavior by breakpoint (NOT by guesswork)
   - No layout side effects
============================================================================ */

export default function BubbleInput({ onSend, loading }) {
  const [text, setText] = useState("");
  const [file, setFile] = useState(null);

  const inputRef = useRef(null);
  const fileInputRef = useRef(null);

  // --------------------------------------------------
  // DEVICE DETECTION (CANONICAL)
  // --------------------------------------------------
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const mq = window.matchMedia("(max-width: 768px)");
    const update = () => setIsMobile(mq.matches);

    update();
    mq.addEventListener?.("change", update);
    return () => mq.removeEventListener?.("change", update);
  }, []);

  // --------------------------------------------------
  // DERIVED STATE
  // --------------------------------------------------
  const canSend = (text.trim().length > 0 || file !== null) && !loading;

  // --------------------------------------------------
  // SUBMIT HANDLER (HYBRID UX)
  // --------------------------------------------------
  function handleSubmit(e) {
    e.preventDefault();
    if (!canSend) return;

    // 1️⃣ Mobile ONLY: blur to release keyboard safely
    if (isMobile && inputRef.current) {
      inputRef.current.blur();
    }

    // 2️⃣ Dispatch message
    onSend(text, file);

    // 3️⃣ Atomic cleanup
    setText("");
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";

    // 4️⃣ Desktop ONLY: restore focus for continuous chat
    if (!isMobile) {
      requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
    }
  }

  // --------------------------------------------------
  // RENDER
  // --------------------------------------------------
  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-3"
      autoComplete="off"
    >
      {/* 📎 FILE PREVIEW */}
      {file && (
        <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded-xl border border-slate-100 animate-in fade-in zoom-in duration-200">
          <div className="flex items-center gap-2 overflow-hidden">
            <span className="text-blue-600 text-sm">📄</span>
            <span className="text-[10px] font-black text-slate-600 truncate uppercase tracking-tight">
              {file.name}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setFile(null)}
            className="w-6 h-6 flex items-center justify-center rounded-full bg-slate-200 text-slate-600 hover:bg-red-100 hover:text-red-600 transition"
          >
            ✕
          </button>
        </div>
      )}

      {/* INPUT SHELL */}
      <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 p-2 rounded-2xl focus-within:border-slate-400 focus-within:ring-1 focus-within:ring-slate-400 transition-all shadow-inner">
        {/* ATTACH */}
        <label className="cursor-pointer p-2 hover:bg-white rounded-xl transition shrink-0">
          <span
            className={`text-xl ${
              file ? "text-blue-600" : "text-slate-400"
            }`}
          >
            {file ? "✓" : "⊕"}
          </span>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept="application/pdf"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />
        </label>

        {/* TEXT INPUT */}
        <input
          ref={inputRef}
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Escribe tu consulta jurídica..."
          className="
            flex-1 bg-transparent border-none outline-none
            text-[16px] text-slate-800
            placeholder:text-slate-400
            disabled:opacity-50
          "
          disabled={loading}
          autoComplete="off"
          enterKeyHint="send"
        />

        {/* SEND BUTTON */}
        <button
          type="submit"
          disabled={!canSend}
          className={`
            w-10 h-10 flex items-center justify-center rounded-xl transition-all
            ${
              canSend
                ? "bg-slate-900 text-white shadow-lg active:scale-90"
                : "bg-slate-200 text-slate-400 cursor-not-allowed"
            }
          `}
        >
          {loading ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <span className="text-lg leading-none">➤</span>
          )}
        </button>
      </div>
    </form>
  );
}
