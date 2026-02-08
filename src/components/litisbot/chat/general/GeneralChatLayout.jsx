import { useAuth } from "@/context/AuthContext";
import { useGeneralChatContext } from "./GeneralChatProvider";
import { useState } from "react";

import GeneralChatHeader from "./GeneralChatHeader";
import GeneralChatSidebar from "./GeneralChatSidebar";
import GeneralChatFeed from "./GeneralChatFeed";
import GeneralChatInput from "./GeneralChatInput";

/* ============================================================================
   R7.7+++ — GENERAL CHAT LAYOUT (CANONICAL)
   - El Layout decide Home vs Chat (autoridad única)
   - El Feed es 100% presentacional
   - Mobile-safe, race-safe
============================================================================ */

export default function GeneralChatLayout() {
  const { user } = useAuth();

  // Contexto unificado del chat
  const chat = useGeneralChatContext();

  // 🧠 FLAG CANÓNICO: el chat empezó
  const hasStartedChat =
    !!chat.activeSessionId || chat.messages.length > 0;

  // Estado local para el Drawer (mobile)
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen w-full bg-white overflow-hidden font-sans text-slate-900">
      
      {/* 📂 SIDEBAR */}
      <GeneralChatSidebar
        {...chat}
        user={user}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* 🏛️ COLUMNA PRINCIPAL */}
      <section className="flex-1 flex flex-col min-w-0 relative">
        
        {/* HEADER */}
        <GeneralChatHeader
          onToggleSidebar={() => setSidebarOpen(true)}
        />

        {/* 📜 FEED */}
        <main className="flex-1 overflow-y-auto bg-white custom-scrollbar relative">
          {hasStartedChat ? (
            <GeneralChatFeed
              messages={chat.messages}
              isLoading={chat.isDispatching}
            />
          ) : (
            <GeneralChatFeed
              forceEmptyState
            />
          )}

          {/* 🔽 Ancla de autoscroll */}
          <div ref={chat.bottomRef} className="h-2 w-full" />
        </main>

        {/* ⌨️ INPUT */}
        <div className="flex-shrink-0 border-t border-slate-100 bg-white">
          <GeneralChatInput />

          {/* Marketing Cognitivo */}
          <div className="flex justify-center pb-2">
            <span className="text-[8px] font-black text-slate-200 uppercase tracking-[0.4em]">
              BúhoLex LegalTech 2026
            </span>
          </div>
        </div>
      </section>
    </div>
  );
}
