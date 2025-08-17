import React, { useState, useEffect } from "react";
import SidebarChats from "@/components/SidebarChats";
import LitisBotChatBasePro from "@/components/LitisBotChatBasePro";

export default function LitisBot({ user: userProp }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [casos, setCasos] = useState([]);
  const [casoActivo, setCasoActivo] = useState(null);

  const user = userProp || { nombre: "Eduardo", pro: true, uid: "invitado" };

  useEffect(() => {
    const handleResize = () => setSidebarOpen(window.innerWidth >= 1024);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  function handleOpenHerramientas() {
    setShowModal(true);
    if (window.innerWidth < 1024) setSidebarOpen(false);
  }

  return (
    <div className="flex w-full min-h-screen bg-white overflow-hidden">
      {/* Botón flotante para abrir el menú en móvil */}
      {!sidebarOpen && (
        <button
          className="fixed top-4 left-4 z-50 lg:hidden bg-yellow-600 text-white p-2 rounded-full shadow-lg"
          onClick={() => setSidebarOpen(true)}
        >
          ☰
        </button>
      )}

      {/* Sidebar como drawer */}
      <div
        className={`fixed inset-y-0 left-0 z-40 transition-transform transform lg:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} lg:relative lg:flex`}
      >
        <SidebarChats
          open={sidebarOpen}
          setOpen={setSidebarOpen}
          casos={casos}
          setCasos={setCasos}
          casoActivo={casoActivo}
          setCasoActivo={setCasoActivo}
          user={user}
          onOpenHerramientas={handleOpenHerramientas}
        />
      </div>

      {/* Contenido principal */}
      <div className="flex-1 flex flex-col overflow-y-auto max-h-screen">
        <LitisBotChatBasePro
          user={user}
          pro={user.pro}
          showModal={showModal}
          setShowModal={setShowModal}
          casoActivo={casoActivo}
          expedientes={casos}
        />
      </div>
    </div>
  );
}
