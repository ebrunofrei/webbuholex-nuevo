import React from "react";
import { FolderKanban } from "lucide-react";
import SidebarChats from "@/components/SidebarChats";
import LitisBotChatBase from "@/components/LitisBotChatBase";
import { useAuth } from "@/context/AuthContext";

function LitisBotPageIntegrada() {
  const [casos, setCasos] = React.useState([]);
  const [casoActivo, setCasoActivo] = React.useState(null);
  const [showModalHerramientas, setShowModalHerramientas] = React.useState(false);
  const [drawerOpen, setDrawerOpen] = React.useState(false);

  const { user } = useAuth() || {};
  const userInfo = user || { nombre: "Invitado", pro: false };

  return (
    <div className="flex w-full min-h-screen bg-white" style={{ height: "100vh", overflow: "hidden" }}>
      {/* Sidebar ESCRITORIO */}
      <aside
        className="hidden lg:flex h-full flex-col"
        style={{
          width: "22vw",
          minWidth: 250,
          maxWidth: 350,
          borderRight: "1px solid #eee",
          background: "#fff",
        }}
      >
        <SidebarChats
          casos={casos}
          setCasos={setCasos}
          casoActivo={casoActivo}
          setCasoActivo={setCasoActivo}
          user={userInfo}
          onOpenHerramientas={() => setShowModalHerramientas(true)}
        />
      </aside>

      {/* Chat principal */}
      <main
        className="flex-1 flex flex-col items-stretch bg-white"
        style={{ minWidth: 0, height: "100vh", overflowY: "auto" }}
      >
        <LitisBotChatBase
          user={userInfo}
          casoActivo={casoActivo}
          expedientes={casos}
          showModal={showModalHerramientas}
          setShowModal={setShowModalHerramientas}
        />
      </main>

      {/* Botón flotante móvil */}
      <button
        onClick={() => setDrawerOpen(true)}
        className="lg:hidden fixed left-4 bottom-24 z-[120] p-3 rounded-full shadow-xl bg-[#5C2E0B] text-white active:scale-95"
        aria-label="Abrir lista de casos"
      >
        <FolderKanban size={22} />
      </button>

      {/* Drawer móvil */}
      {drawerOpen && (
        <div className="lg:hidden fixed inset-0 z-[130]">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setDrawerOpen(false)}
          />
          <div className="absolute left-0 top-0 h-full w-[85vw] max-w-[340px] bg-white shadow-2xl border-r border-[#f4e6c7] flex flex-col">
            <div className="px-4 py-3 border-b flex justify-between items-center">
              <strong>Casos</strong>
              <button
                onClick={() => setDrawerOpen(false)}
                className="text-xl font-bold"
                aria-label="Cerrar"
              >
                &times;
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <SidebarChats
                casos={casos}
                setCasos={setCasos}
                casoActivo={casoActivo}
                setCasoActivo={setCasoActivo}
                user={userInfo}
                onOpenHerramientas={() => setShowModalHerramientas(true)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default LitisBotPageIntegrada;
