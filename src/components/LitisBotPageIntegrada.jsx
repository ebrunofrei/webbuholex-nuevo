import React from "react";
import { useAuth } from "@/context/AuthContext";
import SidebarChats from "@/components/SidebarChats";
import LitisBotChatBase from "@/components/LitisBotChatBase";
import { FolderKanban } from "lucide-react";

export default function LitisBotPageIntegrada() {
  // estado de expedientes / caso activo
  const [casos, setCasos] = React.useState([]);
  const [casoActivo, setCasoActivo] = React.useState(null);

  // modal herramientas bot
  const [showModalHerramientas, setShowModalHerramientas] =
    React.useState(false);

  // sheet móvil (panel "Mis casos")
  const [sidebarOpenMobile, setSidebarOpenMobile] = React.useState(false);

  const { user } = useAuth() || {};
  const userInfo = user || { nombre: "Invitado", pro: false };

  // cuando el sheet móvil está abierto, bloqueamos scroll del body
  React.useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = sidebarOpenMobile ? "hidden" : prev || "";
    return () => {
      document.body.style.overflow = prev || "";
    };
  }, [sidebarOpenMobile]);

  return (
    <div
      className="relative flex w-full bg-white text-[#5C2E0B]"
      style={{
        minHeight: "100dvh",
        maxHeight: "100dvh",
        overflow: "hidden",
      }}
    >
      {/* HEADER MÓVIL FIJO ARRIBA */}
      <header
        className="
          lg:hidden
          fixed top-0 left-0 right-0 z-[150]
          flex items-center h-12 px-4 shadow-md
        "
        style={{
          backgroundColor: "#5C2E0B",
          color: "#fff",
        }}
      >
        {/* botón abrir sheet de casos/herramientas */}
        <button
          onClick={() => setSidebarOpenMobile(true)}
          className="
            flex items-center justify-center
            w-9 h-9 rounded-full bg-white text-[#5C2E0B]
            active:scale-95 shadow
          "
          aria-label="Abrir lista de casos y herramientas"
          title="Casos / Herramientas"
        >
          <FolderKanban size={20} />
        </button>

        <div className="flex-1 text-center text-[14px] font-semibold leading-none">
          LitisBot
        </div>

        {/* elemento fantasma para equilibrar */}
        <div className="w-9 h-9" />
      </header>

      {/* SIDEBAR DESKTOP (fijo a la izquierda) */}
      <SidebarChats
        // desktop siempre visible
        isOpen={true}
        onCloseSidebar={() => {}}
        user={userInfo}
        setCasos={setCasos}
        setCasoActivo={setCasoActivo}
        onOpenHerramientas={() => setShowModalHerramientas(true)}
      />

      {/* SHEET MÓVIL A PANTALLA COMPLETA */}
      <SidebarChats
        // en móvil solo mostramos si sidebarOpenMobile === true
        isOpen={sidebarOpenMobile}
        onCloseSidebar={() => setSidebarOpenMobile(false)}
        user={userInfo}
        setCasos={setCasos}
        setCasoActivo={setCasoActivo}
        onOpenHerramientas={() => {
          setShowModalHerramientas(true);
          setSidebarOpenMobile(false);
        }}
      />

      {/* ÁREA PRINCIPAL DEL CHAT */}
      <main
        className="
          flex-1 flex flex-col items-stretch
          bg-white text-[#5C2E0B] min-w-0
          overflow-y-auto
        "
        style={{
          height: "100dvh",
          WebkitOverflowScrolling: "touch",
          paddingTop: "48px", // espacio para header móvil
        }}
      >
        <LitisBotChatBase
          user={userInfo}
          casoActivo={casoActivo}
          expedientes={casos}
          showModal={showModalHerramientas}
          setShowModal={setShowModalHerramientas}
        />
      </main>
    </div>
  );
}
