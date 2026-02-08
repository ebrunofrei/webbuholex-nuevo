import { useEffect, useRef } from "react";
import LegalMarkdown from "../markdown/LegalMarkdown";

/* ============================================================================
   LITIS | BUBBLE MESSAGES R7.7++ (Enterprise Block Logic)
   - Updated: Kernel Scan Effect para carga de documentos.
   - Design: Bloques Rectos & Terminal Metadata.
============================================================================ */

export default function BubbleMessages({ messages = [], loading = false }) {
  const scrollRef = useRef(null);

  // Autoscroll dinámico: reacciona a nuevos mensajes y al estado de carga
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  return (
    <div className="flex flex-col gap-8 px-6 py-4 custom-scrollbar">
      {messages.map((msg, i) => {
        const isAi = msg.role === "assistant" || msg.role === "system";
        const hasFile = msg.fileName;

        return (
          <div
            key={i}
            className={`flex flex-col animate-in fade-in slide-in-from-bottom-2 duration-500 ${
              isAi ? "items-start" : "items-end"
            }`}
          >
            {/* 🏷️ METADATA TERMINAL */}
            <div className="flex items-center gap-2 mb-2 px-1 opacity-40 select-none">
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-800">
                {isAi ? "Analista Kernel" : "Abogado Solicitante"}
              </span>
              <div className="w-1 h-1 rounded-full bg-slate-300" />
              <span className="text-[9px] font-mono text-slate-500">
                {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>

            {/* 🛡️ CUERPO DEL BLOQUE */}
            <div
              className={`
                relative p-5 text-[15px] leading-relaxed shadow-sm transition-all duration-300 group
                ${
                  isAi
                    ? "bg-white border-l-4 border-slate-900 text-slate-800 rounded-r-2xl rounded-bl-2xl shadow-slate-100/50"
                    : "bg-slate-900 text-white rounded-l-2xl rounded-br-2xl shadow-slate-900/10"
                }
                w-full max-w-[95%] sm:max-w-[85%]
              `}
            >
              {/* 📎 ATTACHED FILE UI */}
              {hasFile && !isAi && (
                <div className="mb-3 flex items-center gap-3 bg-white/10 border border-white/20 p-2 rounded-lg backdrop-blur-sm">
                  <div className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center justify-center">
                    PDF
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-[11px] font-mono truncate opacity-90 tracking-tight">
                      {msg.fileName}
                    </span>
                    <span className="text-[8px] uppercase tracking-tighter opacity-50">
                      Contexto Jurisprudencial Cargado
                    </span>
                  </div>
                </div>
              )}

              {/* Contenido */}
              <div className={isAi ? "font-medium" : "font-normal"}>
                {isAi ? (
                  <LegalMarkdown content={msg.content || msg.text} />
                ) : (
                  <span className="whitespace-pre-wrap">{msg.content || msg.text}</span>
                )}
              </div>

              {/* ⚖️ PIE DE BLOQUE (Solo IA) */}
              {isAi && (
                <div className="mt-4 pt-3 border-t border-slate-50 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-[8px] font-black text-slate-300 uppercase tracking-[0.2em]">
                    Verified Jurisprudence · R7.7++
                  </span>
                  <div className="flex gap-3 text-slate-300">
                     <button className="hover:text-slate-900 transition-colors" title="Ver Fuente">📄</button>
                     <button className="hover:text-slate-900 transition-colors" title="Escuchar">🔊</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })}

      {/* 🧬 KERNEL SCANNING STATE: Efecto visual de análisis */}
      {loading && (
        <div className="flex flex-col items-start animate-in fade-in duration-300">
          <div className="flex items-center gap-2 mb-2 px-1 opacity-40">
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-800">
              Analista Kernel
            </span>
            <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
          </div>

          <div className="w-[75%] bg-white border-l-4 border-blue-600 p-5 rounded-r-2xl rounded-bl-2xl shadow-sm relative overflow-hidden">
            {/* Rayo Láser de Escaneo */}
            <div className="absolute top-0 left-0 w-full h-[2px] bg-blue-500/40 shadow-[0_0_8px_rgba(59,130,246,0.6)] animate-scan" />
            
            <div className="flex flex-col gap-2.5">
              <div className="h-2 bg-slate-100 rounded w-full animate-pulse" />
              <div className="h-2 bg-slate-100 rounded w-[85%] animate-pulse delay-75" />
              <div className="h-2 bg-slate-100 rounded w-[60%] animate-pulse delay-150" />
            </div>

            <div className="mt-4 flex items-center gap-2">
              <div className="w-2 h-2 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">
                Extrayendo Doctrina...
              </span>
            </div>
          </div>
        </div>
      )}
      
      {/* Anchor point para el scroll */}
      <div ref={scrollRef} className="h-2" />

      {/* Keyframes de Escaneo Láser */}
    <style>{`
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