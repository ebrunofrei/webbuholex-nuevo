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
    <div className="relative w-full h-full bg-white flex flex-col">

      {/* HEADER */}
      <div className="sticky top-0 z-20 bg-white">
        <BubbleHeader
          onClose={onClose}
          sessionNote={sessionNote}
          onUnlockRequest={onOpenUnlock}
        />
      </div>

      {/* FEED */}
      <div className="flex-1 overflow-y-auto overscroll-contain">
        <div className="mx-auto max-w-[1100px] px-4 sm:px-10 py-8">
          <BubbleMessages messages={messages} loading={loading} />
        </div>
      </div>

      {/* INPUT — 🔥 BLOQUE ANCLA REAL */}
      <div className="sticky bottom-0 z-30 bg-white">
        <div className="mx-auto max-w-[1100px] px-4 sm:px-10 py-4">
          <div className="
            bg-white
            border border-slate-200
            rounded-2xl
            shadow-[0_-8px_40px_rgba(0,0,0,0.08)]
          ">
            <BubbleInput onSend={onSend} loading={loading} />
          </div>
        </div>
      </div>

    </div>
  );
}
