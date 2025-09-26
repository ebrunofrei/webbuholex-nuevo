import React, { useState } from "react";
import SidebarChats from "@/components/SidebarChats";
import LitisBotChatBase from "@/components/LitisBotChatBase";
import { useAuth } from "@/context/AuthContext";
import { FaBars } from "react-icons/fa";

export default function LitisBotPageIntegrada() {
  const [casos, setCasos] = useState([]);
  const [casoActivo, setCasoActivo] = useState(null);
  const [showModalHerramientas, setShowModalHerramientas] = useState(false);
  const [menuAbierto, setMenuAbierto] = useState(false);

  const { user, isPremium } = useAuth() || {};
  const userInfo = user || { nombre: "Invitado", pro: false };

  return (
    <div className="flex w-full min-h-screen bg-white h-screen overflow-hidden">
      {/* Botón hamburguesa en móvil */}
      <button
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-yellow-700 text-white rounded-md shadow-md"
        onClick={() => setMenuAbierto(true)}
        aria-label="Abrir menú"
      >
        <FaBars size={20} />
      </button>

      {/* Overlay oscuro en móvil */}
      {menuAbierto && (
        <div
          className="fixed inset-0 bg-black/40 z-30 lg:hidden transition-opacity duration-300"
          onClick={() => setMenuAbierto(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar con animación tipo drawer */}
      <div
        className={`fixed lg:static top-0 left-0 h-full z-40 transform transition-transform duration-500 ease-in-out
        ${menuAbierto ? "translate-x-0" : "-translate-x-full"}
        lg:translate-x-0 lg:flex lg:flex-col`}
        style={{
          width: "75vw",
          maxWidth: 320,
          borderRight: "1px solid #f4e6c7",
          background: "#fff",
          boxShadow: menuAbierto ? "4px 0 12px rgba(0,0,0,0.25)" : "none",
        }}
      >
        <SidebarChats
          casos={casos}
          setCasos={setCasos}
          casoActivo={casoActivo}
          setCasoActivo={setCasoActivo}
          user={userInfo}
          onOpenHerramientas={() => setShowModalHerramientas(true)}
          onCloseSidebar={() => setMenuAbierto(false)} // 👈 botón X dentro del sidebar
        />
      </div>

      {/* Chat principal */}
      <div className="flex-1 flex flex-col items-stretch bg-white min-w-0 h-screen overflow-y-auto">
        <LitisBotChatBase
          user={userInfo}
          casoActivo={casoActivo}
          expedientes={casos}
          showModal={showModalHerramientas}
          setShowModal={setShowModalHerramientas}
          pro={isPremium}
        />
      </div>
    </div>
  );
}
