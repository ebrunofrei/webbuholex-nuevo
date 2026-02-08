import BubbleHeader from "./BubbleHeader";
import BubbleMessages from "./BubbleMessages";
import BubbleInput from "./BubbleInput";

/* ============================================================================
   LITIS | BUBBLE CHAT R7.7++ – CLEAN LAYOUT
   - Soporte para sessionNote (badge)
   - Layout 100% pasivo (sin lógica de unlock ni pagos)
============================================================================ */

export default function BubbleChatLayout({
  messages,
  onSend,
  onClose,
  loading,

  // 🟢 Session-level notice (desde Provider)
  sessionNote,

  // 🟢 Intención: abrir modal de desbloqueo
  onOpenUnlock,
}) {
  return (
    <div
        className="
            fixed inset-0 sm:inset-auto
            sm:bottom-4 sm:right-4

            h-[100dvh] sm:h-[680px]
            max-h-[100dvh] sm:max-h-[680px]

            bg-white
            rounded-none sm:rounded-3xl
            shadow-none sm:shadow-[0_40px_100px_-20px_rgba(0,0,0,0.3)]

            flex flex-col
            overflow-hidden
            border border-slate-200/50

            animate-in fade-in slide-in-from-bottom-8 duration-500
        "
        >
      {/* HEADER */}
      <BubbleHeader
        onClose={onClose}
        sessionNote={sessionNote}
        onUnlockRequest={onOpenUnlock}
      />

      {/* MESSAGE FEED */}
    <div className="flex-1 overflow-y-auto overscroll-contain touch-pan-y bg-white custom-scrollbar">
      <div className="h-full w-full py-4 sm:py-6 px-2 sm:px-0">
        <BubbleMessages messages={messages} />
      </div>
     </div>

      {/* INPUT */}
      <div className="p-3 sm:p-6 bg-white border-t border-slate-50">
    < div className="bg-slate-50 rounded-2xl p-1.5 border border-slate-200/50 shadow-inner">
        <BubbleInput onSend={onSend} loading={loading} />
    </div>

        {/* TECH META */}
        <div className="flex items-center justify-between mt-3 sm:mt-4 px-2">
          <div className="flex items-center gap-3">
            <span className="text-[9px] font-mono text-slate-400 bg-slate-100 px-2 py-0.5 rounded uppercase tracking-tighter">
              Ver: 7.7.02
            </span>
            <span className="text-[9px] font-black text-slate-800 uppercase tracking-[0.2em]">
              Cognitive Session
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div
              className={`w-1.5 h-1.5 rounded-full ${
                loading
                  ? "bg-orange-400 animate-pulse"
                  : "bg-blue-500 animate-pulse"
              }`}
            />
            <span className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">
              {loading ? "Procesando" : "Listo"}
            </span>
          </div>
        </div>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #f1f5f9;
          border-radius: 10px;
        }
      `}</style>
    </div>
  );
}
