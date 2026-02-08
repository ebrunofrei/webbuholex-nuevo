import { useAuth } from "@/context/AuthContext";
import { useGeneralChatContext } from "./GeneralChatProvider";
import { useState } from "react";

import GeneralChatHeader from "./GeneralChatHeader";
import GeneralChatSidebar from "./GeneralChatSidebar";
import GeneralChatFeed from "./GeneralChatFeed";
import GeneralChatInput from "./GeneralChatInput";

/* ============================================================================
   R7.7 — GENERAL CHAT LAYOUT (CANONICAL)
   - Resuelve el error de referencia unificando el contexto del chat.
   - Establece la jerarquía de blanco puro y sobriedad estructural.
============================================================================ */

export default function GeneralChatLayout() {
  const { user } = useAuth();
  
  // Consumimos el contexto unificado para evitar errores de prop-drilling
  const chat = useGeneralChatContext();

  // Estado local para el Drawer en dispositivos móviles
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen w-full bg-white overflow-hidden font-sans text-slate-900">
      
      {/* 📂 SIDEBAR: Implementación controlada */}
      <GeneralChatSidebar
        {...chat} // Pasa sessions, activeSessionId, createSession, etc.
        user={user}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* 🏛️ COLUMNA PRINCIPAL DE TRABAJO */}
      <section className="flex-1 flex flex-col min-w-0 relative">
        
        {/* HEADER: Identidad y Toggle */}
        <GeneralChatHeader
          onToggleSidebar={() => setSidebarOpen(true)}
        />

        {/* 📜 ÁREA DE FEED: Scroll independiente y blanco puro */}
        <main className="flex-1 overflow-y-auto bg-white custom-scrollbar relative">
          {/* El Feed ahora recibe isLoading para el Skeleton de razonamiento */}
          <GeneralChatFeed 
            messages={chat.messages} 
            isLoading={chat.isDispatching} 
          />
          
          {/* Ancla para el autoscroll del Kernel */}
          <div ref={chat.bottomRef} className="h-2 w-full" />
        </main>

        {/* ⌨️ INPUT: Zona de captura Enterprise */}
        <div className="flex-shrink-0 border-t border-slate-100 bg-white">
          <GeneralChatInput />
          
          {/* Marketing Cognitivo R7.7++ */}
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