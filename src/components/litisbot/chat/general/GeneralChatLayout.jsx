import { useAuth } from "@/context/AuthContext";
import { useGeneralChatContext } from "./GeneralChatProvider";
import { useState } from "react";

import GeneralChatHeader from "./GeneralChatHeader";
import GeneralChatSidebar from "./GeneralChatSidebar";
import GeneralChatFeed from "./GeneralChatFeed";
import GeneralChatInput from "./GeneralChatInput";

/* ============================================================================
   R7.7+++ — GENERAL CHAT LAYOUT (CANÓNICO DEFINITIVO)
   - Scroll SOLO en el Feed
   - Sidebar y Header fijos
   - Input siempre visible
   - Mobile real safe (teclado)
============================================================================ */

export default function GeneralChatLayout() {
  const { user } = useAuth();
  const chat = useGeneralChatContext();

  const hasStartedChat =
    !!chat.activeSessionId || chat.messages.length > 0;

  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex w-full h-[100dvh] bg-white overflow-hidden font-sans text-slate-900">
      
      {/* 📂 SIDEBAR (NO SCROLL GLOBAL) */}
      <GeneralChatSidebar
        {...chat}
        user={user}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* 🏛️ COLUMNA PRINCIPAL */}
      <section className="flex-1 flex flex-col min-w-0 relative">
        
        {/* HEADER (FIJO) */}
        <div className="flex-shrink-0">
          <GeneralChatHeader
            onToggleSidebar={() => setSidebarOpen(true)}
          />
        </div>

        {/* 📜 FEED (ÚNICO SCROLL) */}
        <main className="flex-1 overflow-y-auto overscroll-contain bg-white relative touch-pan-y">
          {hasStartedChat ? (
            <GeneralChatFeed
              messages={chat.messages}
              isLoading={chat.isDispatching}
            />
          ) : (
            <GeneralChatFeed forceEmptyState />
          )}

          {/* 🔽 Ancla de autoscroll */}
          <div ref={chat.bottomRef} className="h-2 w-full" />
        </main>

        {/* ⌨️ INPUT (FIJO ABAJO, NO SCROLL) */}
        <div className="flex-shrink-0 border-t border-slate-100 bg-white">
          <GeneralChatInput />

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
