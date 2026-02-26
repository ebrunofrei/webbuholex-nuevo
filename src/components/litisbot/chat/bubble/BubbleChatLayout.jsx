import BubbleHeader from "./BubbleHeader";
import BubbleMessages from "./BubbleMessages";
import BubbleInput from "./BubbleInput";

/* ============================================================================
   LITIS | BUBBLE CHAT R7.7++ – PREMIUM DOCUMENT LAYOUT
   - Mobile: Chat UX
   - Desktop: Editorial / Informe jurídico
============================================================================ */

export default function BubbleChatLayout({
  messages,
  onSend,
  onClose,
  loading,
  sessionNote,
  onOpenUnlock,
}) {
  return (
    <div
      className="
        relative w-full h-full flex flex-col
        bg-white
        border border-slate-200
        shadow-2xl
        rounded-2xl
        overflow-hidden
      "
    >

      {/* HEADER */}
      <div className="sticky top-0 z-20 bg-white">
        <BubbleHeader
          onClose={onClose}
          sessionNote={sessionNote}
          onUnlockRequest={onOpenUnlock}
        />
      </div>

      {/* FEED */}
      <div className="flex-1 overflow-y-auto overscroll-contain px-6 py-8 bubble-scroll">
        <BubbleMessages messages={messages} loading={loading} />
      </div>

      {/* INPUT — 🔥 BLOQUE ANCLA REAL */}
      <div className="sticky bottom-0 z-30 bg-white">
        <div className="mx-auto max-w-[1100px] px-4 sm:px-10 py-4">
          <div className="
            bg-white
            border border-slate-200
            rounded-2xl
            shadow-lg
            border-t border-slate-200
          ">
            <BubbleInput onSend={onSend} loading={loading} />
          </div>
        </div>
      </div>

    </div>
  );
}
