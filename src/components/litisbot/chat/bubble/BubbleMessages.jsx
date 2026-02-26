import { useEffect, useRef } from "react";
import LegalMarkdown from "../markdown/LegalMarkdown";

/* ============================================================================
   LITIS | BUBBLE MESSAGES — R7.7++ FINAL CANONICAL
   ----------------------------------------------------------------------------
   DESIGN GOALS:
   - Desktop: Editorial / Legal Reading (NOT chat-like)
   - Mobile: Conversational, breathing rhythm
   - AI blocks expand naturally (document-style)
   - User blocks remain concise
   - Scroll isolated to message container
   - ✅ Conversational Anchor (anti-modal effect)
============================================================================ */

export default function BubbleMessages({ messages = [], loading = false }) {
  const scrollRef = useRef(null);

  // Auto-scroll on new messages or loading
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  return (
    <div className="flex flex-col gap-12">
      {messages.map((msg, index) => {
        const isAI = msg.role === "assistant" || msg.role === "system";
        const hasFile = Boolean(msg.fileName);

        return (
          <div key={index}>
            {/* ============================================================
               MESSAGE WRAPPER
            ============================================================ */}
            <div
              className={`flex flex-col animate-in fade-in slide-in-from-bottom-2 duration-500 ${
                isAI ? "items-start" : "items-end"
              }`}
            >
              {/* ───────────── METADATA ───────────── */}
              <div className="flex items-center gap-2 mb-2 px-1 opacity-40 select-none">
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-800">
                  {isAI ? "Kernel Analyst" : "Requesting Lawyer"}
                </span>
                <div className="w-1 h-1 rounded-full bg-slate-300" />
                <span className="text-[9px] font-mono text-slate-500">
                  {new Date().toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>

              {/* ───────────── MESSAGE BLOCK ───────────── */}
              <div
                className={`
                  relative p-6 transition-all duration-300 group
                  ${
                    isAI
                      ? `
                        bg-white
                        rounded-none
                        border-none
                        shadow-none
                        w-full
                      `
                      : `
                        bg-slate-900 text-white
                        rounded-2xl
                        shadow-md
                        w-full max-w-[85%] sm:max-w-[70%]
                      `
                  }
                `}
              >
                
                {/* ───────── FILE (User only) ───────── */}
                {hasFile && !isAI && (
                  <div className="mb-4 flex items-center gap-3 bg-white/10 border border-white/20 p-3 rounded-lg backdrop-blur-sm">
                    <div className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                      PDF
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-[11px] font-mono truncate opacity-90 tracking-tight">
                        {msg.fileName}
                      </span>
                      <span className="text-[8px] uppercase tracking-tighter opacity-50">
                        Jurisprudential Context Loaded
                      </span>
                    </div>
                  </div>
                )}

                {/* ───────── CONTENT ───────── */}
                <div
                  className={
                    isAI
                      ? "litis-legal-reading font-normal leading-[1.85] tracking-[0.01em] text-[15.5px] lg:text-[16px]"
                      : "font-normal whitespace-pre-wrap"
                  }
                >
                  {isAI ? (
                    <LegalMarkdown content={msg.content || msg.text} />
                  ) : (
                    msg.content || msg.text
                  )}
                </div>
              </div>
            </div>

            {/* ============================================================
               🧠 CONVERSATIONAL ANCHOR (CRÍTICO)
               - Rompe lectura continua
               - Devuelve sensación de turno
            ============================================================ */}
            {isAI && (
              <div
                className="h-12 sm:h-20 w-full pointer-events-none"
                aria-hidden="true"
              />
            )}
          </div>
        );
      })}

      {/* ───────── LOADING STATE ───────── */}
      {loading && (
        <div className="flex flex-col items-start animate-in fade-in duration-300">
          <div className="flex items-center gap-2 mb-2 px-1 opacity-40">
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-800">
              Kernel Analyst
            </span>
            <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
          </div>

          <div className="relative w-full max-w-[72ch] bg-white border-l-4 border-blue-600 p-6 rounded-r-2xl rounded-bl-2xl shadow-sm overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-[2px] bg-blue-500/40 animate-scan" />

            <div className="flex flex-col gap-3">
              <div className="h-2 bg-slate-100 rounded w-full animate-pulse" />
              <div className="h-2 bg-slate-100 rounded w-[85%] animate-pulse delay-75" />
              <div className="h-2 bg-slate-100 rounded w-[60%] animate-pulse delay-150" />
            </div>
          </div>
        </div>
      )}

      {/* Scroll anchor técnico */}
      <div ref={scrollRef} className="h-2" />

      {/* ───────── LOCAL STYLES ───────── */}
      <style>{`
        .litis-legal-reading p {
          margin-bottom: 1.15em;
        }
        @keyframes scan {
          0% { transform: translateY(0); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translateY(80px); opacity: 0; }
        }
        .animate-scan {
          animation: scan 2.5s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
