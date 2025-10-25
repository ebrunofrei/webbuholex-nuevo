/* ============================================================
   LitisBotPageIntegrada
   - Sidebar fijo en escritorio
   - Drawer deslizable en móvil
   - Header móvil fijo arriba
   - Chat ocupa toda la altura visible
============================================================ */
function LitisBotPageIntegrada() {
  const [casos, setCasos] = React.useState([]);
  const [casoActivo, setCasoActivo] = React.useState(null);
  const [showModalHerramientas, setShowModalHerramientas] = React.useState(false);

  // Drawer móvil abierto?
  const [sidebarOpenMobile, setSidebarOpenMobile] = React.useState(false);

  const { user } = useAuth() || {};
  const userInfo = user || { nombre: "Invitado", pro: false };

  // Bloquear scroll del <body> cuando el drawer está abierto en móvil
  React.useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    if (sidebarOpenMobile) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = prevOverflow || "";
    }
    return () => {
      document.body.style.overflow = prevOverflow || "";
    };
  }, [sidebarOpenMobile]);

  return (
    <div className="relative flex w-full h-screen bg-white overflow-hidden">

      {/* 🟤 HEADER MÓVIL (oculto en escritorio)
          fijo arriba => deja espacio con padding-top en el main */}
      <header
        className="lg:hidden fixed top-0 left-0 right-0 z-40
                   flex items-center justify-between
                   px-4 py-3
                   bg-[#5C2E0B] text-white shadow-md"
      >
        {/* Botón abrir drawer de casos/herramientas */}
        <button
          onClick={() => setSidebarOpenMobile(true)}
          aria-label="Abrir menú de casos"
          className="flex items-center gap-2 active:scale-95"
          style={{ fontSize: 14, fontWeight: 600 }}
        >
          <FolderKanban size={22} />
          <span>Casos</span>
        </button>

        <span className="text-sm font-semibold select-none">
          LitisBot
        </span>

        {/* placeholder para mantener spacing simétrico */}
        <span className="w-[22px]" />
      </header>

      {/* 🟤 SIDEBAR ESCRITORIO (lg y más) */}
      <aside
        className="hidden lg:flex lg:flex-col lg:flex-shrink-0
                   lg:h-full lg:overflow-y-auto
                   bg-white"
        style={{
          width: "300px",
          borderRight: "1px solid #eee",
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

      {/* 🟤 DRAWER MÓVIL (solo cuando sidebarOpenMobile = true) */}
      {sidebarOpenMobile && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          {/* Capa oscura clickeable para cerrar */}
          <div
            className="flex-1 bg-black/40"
            onClick={() => setSidebarOpenMobile(false)}
          />

          {/* Panel lateral */}
          <aside
            className="relative flex flex-col h-full w-[80vw] max-w-[320px]
                       bg-[#fffef4] text-[#5C2E0B]
                       shadow-xl border-r border-[#f4e6c7]
                       overflow-y-auto"
          >
            {/* Barra arriba del drawer con botón cerrar */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#f4e6c7] sticky top-0 bg-[#fffef4] z-10">
              <div className="font-semibold text-[#5C2E0B] text-base flex items-center gap-2">
                <FolderKanban size={20} />
                <span>Mis casos</span>
              </div>

              <button
                onClick={() => setSidebarOpenMobile(false)}
                aria-label="Cerrar menú"
                className="text-[#5C2E0B] text-xl font-bold leading-none"
              >
                ×
              </button>
            </div>

            {/* Contenido del drawer: SidebarChats reutilizado */}
            <SidebarChats
              casos={casos}
              setCasos={setCasos}
              casoActivo={casoActivo}
              setCasoActivo={setCasoActivo}
              user={userInfo}
              onOpenHerramientas={() => {
                setShowModalHerramientas(true);
                setSidebarOpenMobile(false); // opcional cerrar el drawer
              }}
              isOpen={sidebarOpenMobile}
              onCloseSidebar={() => setSidebarOpenMobile(false)}
            />
          </aside>
        </div>
      )}

      {/* 🟤 ÁREA DEL CHAT
          - en mobile le damos padding-top = altura header (pt-[52px])
          - en desktop sin padding-top
          - overflow-hidden + flex-col para que el feed interno maneje scroll
      */}
      <main
        className="flex-1 flex flex-col bg-white overflow-hidden
                   pt-[52px] lg:pt-0"
        style={{
          minWidth: 0,
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
