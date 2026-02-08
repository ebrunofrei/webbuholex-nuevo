import { useMemo } from "react";
import { FaGavel, FaRegCopy, FaVolumeUp } from "react-icons/fa";

// ✅ RUTAS REALES
import LegalMarkdown from "@/components/litisbot/chat/markdown/LegalMarkdown";
import ChatEmptyState from "@/components/litisbot/chat/shared/ChatEmptyState";
import ChatAvatar from "@/components/litisbot/chat/shared/ChatAvatar";

/**
 * R7.7 — GENERAL CHAT FEED (SAFE)
 * ❌ No controla scroll
 * ❌ No controla layout
 * ✅ Solo renderiza mensajes
 */
export default function GeneralChatFeed({ messages = [], isLoading = false }) {
  const safeMessages = useMemo(
    () => (Array.isArray(messages) ? messages : []),
    [messages]
  );

  if (safeMessages.length === 0 && !isLoading) {
    return <ChatEmptyState />;
  }

  return (
    <div className="flex justify-center px-4 py-8">
      <div className="w-full max-w-4xl flex flex-col gap-10">
        {safeMessages.map((msg, idx) => {
          const isAi = msg.role === "assistant";

          return (
            <div
              key={idx}
              className={`flex ${
                msg.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              {/* Message */}
              <div className={`flex flex-col gap-3 max-w-[88%]`}>
                <div
                  className={`px-6 py-5 text-[16px] leading-relaxed border shadow-sm
                    ${
                      isAi
                        ? "bg-white text-slate-800 border-slate-100 rounded-2xl rounded-tl-none"
                        : "bg-slate-900 text-white border-slate-900 rounded-2xl rounded-tr-none"
                    }`}
                >
                  {isAi ? (
                    <LegalMarkdown content={msg.content} />
                  ) : (
                    <span className="whitespace-pre-wrap font-medium">
                      {msg.content}
                    </span>
                  )}
                </div>

                {/* Meta IA */}
                {isAi && (
                  <div className="flex items-center gap-4 px-2 text-slate-300">
                    <div className="flex gap-3">
                      <FaVolumeUp size={14} />
                      <FaRegCopy size={14} />
                    </div>
                    <span className="text-[9px] font-black uppercase tracking-widest flex items-center gap-1 text-slate-400">
                      <FaGavel className="opacity-50" />
                      Protocolo R7.7++
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {isLoading && (
          <div className="flex gap-5 animate-pulse">
            <div className="w-10 h-10 rounded-xl bg-slate-200" />
            <div className="h-16 bg-slate-100 rounded-2xl w-3/4" />
          </div>
        )}
      </div>
    </div>
  );
}
