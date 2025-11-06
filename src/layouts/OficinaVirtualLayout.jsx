// src/layouts/oficinavirtuallayout.jsx
import React from "react";
import Sidebar from "@/components/Sidebar";

/**
 * OficinaVirtualLayout
 * - Layout simple con sidebar fijo y área principal para children
 * - Sin dependencias de NoticiasContext ni LitisBotChatContext
 */
export default function OficinaVirtualLayout({ children }) {
  return (
    <div className="min-h-screen w-full flex bg-gray-50">
      {/* Sidebar fijo (izquierda) */}
      <aside className="flex-shrink-0">
        <Sidebar />
      </aside>

      {/* Contenido principal */}
      <main className="flex-1 min-w-0 p-4">
        {children}
      </main>
    </div>
  );
}
