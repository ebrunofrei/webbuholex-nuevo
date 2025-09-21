import React from "react";
import SidebarChats from "@/components/SidebarChats";
import LitisBotChatBase from "@/components/LitisBotChatBase";

export default function Layout() {
  return (
    <div className="relative min-h-[100dvh] bg-white">
      {/* Sidebar es fixed; no ocupa ancho en móvil */}
      <SidebarChats />
      {/* En desktop reservamos 64px con padding-left */}
      <main className="min-h-[100dvh] md:pl-64 flex flex-col bg-white overflow-x-hidden">
        <LitisBotChatBase />
      </main>
    </div>
  );
}
