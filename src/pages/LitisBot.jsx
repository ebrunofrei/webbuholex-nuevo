// src/pages/LitisBot.jsx (o donde lo tengas)

import React, { useState, useEffect, useCallback } from "react";
import SidebarChats from "@/components/SidebarChats";
import LitisBotChatBasePro from "@/components/LitisBotChatBasePro";

/**
 * LitisBot
 * - Orquesta el layout completo:
 *   - Sidebar (casos / chats)
 *   - Ventana principal del chat (ChatBasePro)
 * - Controla:
 *   - qué caso / chat está activo
 *   - visibilidad del sidebar en mobile/desktop
 *   - visibilidad del modal de herramientas
 */
export default function LitisBot({ user: userProp }) {
  /* =====================================================
     👤 Usuario autenticado / fallback invitado PRO demo
     ===================================================== */
  const user =
    userProp || { nombre: "Eduardo", pro: true, uid: "invitado" };
  // NOTE:
  // - user.pro controla si mostramos features PRO en el chat

  /* =====================================================
     🗂 Estado de trabajo
     ===================================================== */
  // lista de casos/proyectos guardados (persistentes)
  const [casos, setCasos] = useState([]);

  // id o descriptor del caso/chat actualmente abierto
  const [casoActivo, setCasoActivo] = useState(null);

  // modal de “Herramientas LitisBot”
  const [showModal, setShowModal] = useState(false);

  // sidebar visible (en desktop debe estar abierto por defecto)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  /* =====================================================
     📱 Responsivo: abrir sidebar automáticamente en desktop
     ===================================================== */
  useEffect(() => {
    // protección SSR / build
    if (typeof window === "undefined") return;

    const syncSidebarWithViewport = () => {
      // regla actual:
      // - >=1024px (lg:) => sidebar abierto
      // - <1024px => sidebar cerrado
      setIsSidebarOpen(window.innerWidth >= 1024);
    };

    // set inicial
    syncSidebarWithViewport();

    // listener de resize
    window.addEventListener("resize", syncSidebarWithViewport);
    return () => {
      window.removeEventListener("resize", syncSidebarWithViewport);
    };
  }, []);

  /* =====================================================
     🛠 Abrir herramientas (también cierra sidebar en mobile)
     ===================================================== */
  const handleOpenHerramientas = useCallback(() => {
    setShowModal(true);

    // en mobile quiero que el sidebar se oculte para ver el modal tranquilo
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      setIsSidebarOpen(false);
    }
  }, []);

  /* =====================================================
     🎚 Toggle sidebar manual desde botón hamburguesa (mobile)
     ===================================================== */
  const openSidebar = () => setIsSidebarOpen(true);
  const closeSidebar = () => setIsSidebarOpen(false);

  /* =====================================================
     🖼 Render
     ===================================================== */
  return (
    <div className="flex w-full min-h-screen bg-white overflow-hidden">
      {/* ========== BOTÓN HAMBURGUESA (solo móvil/tablet) ========== */}
      {!isSidebarOpen && (
        <button
          type="button"
          className="
            fixed top-4 left-4 z-50
            lg:hidden
            bg-yellow-600 text-white
            p-2 rounded-full shadow-lg
            active:scale-95 transition
          "
          onClick={openSidebar}
          aria-label="Abrir menú de casos"
          title="Abrir menú"
        >
          ☰
        </button>
      )}

      {/* ========== SIDEBAR (drawer móvil / fijo desktop) ========== */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-40
          transition-transform transform
          bg-white
          border-r border-yellow-200
          lg:translate-x-0
          ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}
          lg:relative lg:flex
        `}
      >
        <SidebarChats
          isOpen={isSidebarOpen}
          onCloseSidebar={closeSidebar}
          casos={casos}
          setCasos={setCasos}
          casoActivo={casoActivo}
          setCasoActivo={setCasoActivo}
          user={user}
          onOpenHerramientas={handleOpenHerramientas}
          // 👇 futuro:
          // onNuevoCaso={...}
          // onNuevoChat={...}
        />
      </aside>

      {/* ========== PANEL PRINCIPAL DEL CHAT ========== */}
      <main className="flex-1 flex flex-col overflow-y-auto max-h-screen bg-white">
        <LitisBotChatBasePro
          user={user}
          pro={user.pro}
          showModal={showModal}
          setShowModal={setShowModal}
          casoActivo={casoActivo}
          expedientes={casos}
        />
      </main>
    </div>
  );
}
