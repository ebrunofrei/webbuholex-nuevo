import React, { useState } from "react";
import SidebarChats from "@components/SidebarChats";
import LitisBotChatBase from "@components/LitisBotChatBase";

export default function Layout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="relative min-h-[100dvh] bg-white flex">
      {/* Sidebar controlado */}
      <SidebarChats
        isOpen={isSidebarOpen}
        onCloseSidebar={() => setIsSidebarOpen(false)}
      />

      {/* Contenido principal */}
      <main className="flex-1 min-h-[100dvh] flex flex-col bg-white overflow-x-hidden">
        {/* Botón hamburguesa solo en móvil */}
        <button
          className="p-2 m-2 bg-[#b03a1a] text-white rounded lg:hidden"
          onClick={() => setIsSidebarOpen(true)}
        >
          ☰
        </button>

        <LitisBotChatBase />
      </main>
    </div>
  );
}
