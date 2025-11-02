import React, { useEffect, useState } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";

// Páginas varias
import SeedBrandingPage from "@/pages/SeedBrandingPage";
import Blog from "./pages/Blog";
import Home from "./pages/Home";
import Servicios from "./pages/Servicios";
import Contacto from "./pages/Contacto";
import BibliotecaJ from "./pages/Biblioteca";
import Jurisprudencia from "@/pages/Jurisprudencia";
import JurisprudenciaVisorModal from "@/components/jurisprudencia/JurisprudenciaVisorModal";
import Codigos from "./pages/Codigos";
import CodigoDetalle from "./pages/CodigoDetalle";
import NoticiasHome from "./pages/Noticias";
import ArticuloBlog from "./pages/ArticuloBlog";
import Nosotros from "./pages/Nosotros";
import LoginAdmin from "./pages/admin/LoginAdmin";
import DashboardAdmin from "./pages/admin/DashboardAdmin";
import SubirLibro from "./pages/admin/SubirLibro";
import ConsultasAdmin from "./pages/admin/ConsultasAdmin";
import PublicarArticulo from "./pages/admin/PublicarArticulo";
import Error404 from "./pages/Error404";
import Login from "./pages/Login";
import MiCuenta from "./pages/MiCuenta";
import HistorialArchivos from "./pages/HistorialArchivos";
import BibliotecaDrive from "./components/BibliotecaDrive";
import PoliticaPrivacidad from "@/pages/legal/politica-de-privacidad";
import TerminosCondiciones from "@/pages/legal/terminos-y-condiciones";
import AvisoCookies from "@/pages/legal/aviso-cookies";
import CookiesBanner from "@/components/CookiesBanner";
import PricingPage from "./pages/PricingPage";
import LandingSaaS from "./pages/LandingSaaS";
import ChatTest from "@/components/ChatTest";
import ServicioDetalle from "@/pages/ServicioDetalle";
import ServiciosAdmin from "@/pages/admin/ServiciosAdmin";
import RecuperarPassword from "./components/RecuperarPassword";
import PersonalizacionView from "./views/PersonalizacionView";
import PruebaNoticias from "@/pages/PruebaNoticias";

// Contextos globales
import { LitisBotChatProvider } from "./context/LitisBotChatContext";
import { NoticiasProvider } from "./context/NoticiasContext";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { LitisBotProvider } from "./context/LitisBotContext";
import { ToastProvider } from "@/components/ui/use-toast";
import { GoogleAuthRootProvider } from "@/context/GoogleAuthContext";

// Componentes generales
import Navbar from "./components/ui/Navbar";
import Footer from "./components/Footer";
import RutaPrivada from "./components/RutaPrivada";
import NoticiasSlider from "./components/NoticiasSlider";
import NoticiasBotonFlotante from "./components/ui/NoticiasBotonFlotante";
import ModalLogin from "./components/ModalLogin";

// Oficina virtual
import Sidebar from "./components/Sidebar";
import Oficina from "@/oficinaVirtual/pages/Oficina";
import CasillaExpedientes from "./oficinaVirtual/pages/CasillaExpedientes";
import ExpedienteDetalle from "./oficinaVirtual/pages/ExpedienteDetalle";
import ExpedienteJudicialDetalle from "./oficinaVirtual/pages/ExpedienteJudicialDetalle";
import ExpedienteAdministrativoDetalle from "./oficinaVirtual/pages/ExpedienteAdministrativoDetalle";
import Biblioteca from "./oficinaVirtual/pages/Biblioteca";
import Agenda from "./oficinaVirtual/pages/Agenda";
import LitisBotAudienciaPage from "./oficinaVirtual/pages/LitisBotAudiencia";
import Notificaciones from "./oficinaVirtual/pages/Notificaciones";
import Perfil from "./oficinaVirtual/pages/Perfil";
import OficinaVirtualRoutes from "./oficinaVirtual/routes/OficinaVirtualRoutes";
import NoticiasOficina from "./oficinaVirtual/pages/Noticias";
import HazteConocido from "./oficinaVirtual/pages/HazteConocido";
import FirmarEscrito from "./oficinaVirtual/pages/escritorio/FirmarEscrito";
import CalculadoraLaboral from "@/oficinaVirtual/pages/CalculadoraLaboral";
import ConfigurarAlertas from "@/oficinaVirtual/components/ConfigurarAlertas"; // <- si todavía lo usas dentro

// Chat IA pantalla completa
import SidebarChats from "@/components/SidebarChats";
import LitisBotChatBase from "@/components/LitisBotChatBase";

// Burbuja flotante IA global
import LitisBotBubbleChat from "@/components/ui/LitisBotBubbleChat";

// hook FCM
import { useFirebaseMessaging } from "@/hooks/useFirebaseMessaging";

// icono botón mobile para abrir sidebar de casos
import { FolderKanban } from "lucide-react";

/* ────────────────────────────────────────────────
   Helper: render only on client (evita hydration mismatch)
──────────────────────────────────────────────── */
function ClientOnly({ children }) {
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  return ready ? <>{children}</> : null;
}

/* ────────────────────────────────────────────────
   Layout OficinaVirtual: sidebar fijo escritorio
──────────────────────────────────────────────── */
function OficinaVirtualLayout({ children }) {
  return (
    <div className="min-h-screen flex bg-gray-50">
      <Sidebar />
      <main className="flex-1 bg-gray-50 p-4 min-w-0">{children}</main>
    </div>
  );
}

/* ────────────────────────────────────────────────
   Pantalla /litisbot (chat grande con sidebar de casos)
   Objetivos:
   - 100dvh => ocupa alto real del móvil
   - botón flotante 📂 con z-index alto y bottom seguro
   - drawer lateral en móvil con scroll propio
   - bloquear scroll del <body> mientras drawer está abierto
──────────────────────────────────────────────── */
function LitisBotPageIntegrada() {
  const [casos, setCasos] = React.useState([]);
  const [casoActivo, setCasoActivo] = React.useState(null);
  const [showModalHerramientas, setShowModalHerramientas] = React.useState(false);

  // control de drawer móvil
  const [sidebarOpenMobile, setSidebarOpenMobile] = React.useState(false);

  // info del usuario
  const { user } = useAuth() || {};
  const userInfo = user || { nombre: "Invitado", pro: false };

  // bloquear scroll body cuando drawer abierto
  React.useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = sidebarOpenMobile ? "hidden" : prev || "";
    return () => {
      document.body.style.overflow = prev || "";
    };
  }, [sidebarOpenMobile]);

  return (
    <section
      className="flex w-full bg-white text-[#5C2E0B]"
      style={{
        minHeight: "100dvh",
        maxHeight: "100dvh",
        overflow: "hidden", // evita doble scroll
      }}
    >
      {/* SIDEBAR ESCRITORIO (lg+) */}
      <aside
        className="hidden lg:flex flex-col flex-shrink-0 border-r border-[#f4e6c7] bg-white"
        style={{
          width: "300px",
          height: "100dvh",
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

      {/* BOTÓN FLOTANTE (MÓVIL) PARA ABRIR CASOS */}
      {!sidebarOpenMobile && (
        <button
          className="
            lg:hidden
            fixed
            left-4
            z-[300]
            rounded-full
            shadow-xl
            active:scale-95
            flex items-center justify-center
            text-white
          "
          style={{
            bottom: "calc(env(safe-area-inset-bottom,0px) + 88px)", // por encima de la barra de input
            width: "48px",
            height: "48px",
            background: "#5C2E0B",
          }}
          onClick={() => setSidebarOpenMobile(true)}
          aria-label="Abrir lista de casos"
          title="Casos / Herramientas"
        >
          <FolderKanban size={22} />
        </button>
      )}

      {/* DRAWER MÓVIL */}
      {sidebarOpenMobile && (
  <>
    {/* capa oscura que cubre el fondo y cierra al tocar */}
    <div
      className="
        fixed inset-0
        bg-black/40
        z-[200]
        lg:hidden
      "
      style={{ pointerEvents: "auto" }}
      onClick={() => setSidebarOpenMobile(false)}
    />

    {/* panel lateral encima del overlay */}
    <aside
      className="
        fixed right-0 top-0
        lg:hidden
        flex flex-col
        w-[80vw] max-w-[320px]
        h-[100dvh]
        bg-white
        shadow-2xl
        border-l border-[#f4e6c7]
        z-[210]
      "
      style={{
        pointerEvents: "auto",
        WebkitOverflowScrolling: "touch",
        overflowY: "auto",
      }}
    >
      <SidebarChats
        casos={casos}
        setCasos={setCasos}
        casoActivo={casoActivo}
        setCasoActivo={setCasoActivo}
        user={userInfo}
        onOpenHerramientas={() => {
          setShowModalHerramientas(true);
          // opcional: cerramos el drawer cuando entra a Herramientas
          setSidebarOpenMobile(false);
        }}
        isOpen={sidebarOpenMobile}
        onCloseSidebar={() => setSidebarOpenMobile(false)}
      />
    </aside>
  </>
)}

      {/* ÁREA PRINCIPAL DEL CHAT */}
      <main
        className="flex-1 flex flex-col items-stretch bg-white text-[#5C2E0B]"
        style={{
          minWidth: 0,
          height: "100dvh",
          maxHeight: "100dvh",
          overflowY: "auto",
          WebkitOverflowScrolling: "touch",
          backgroundColor: "#ffffff",
          position: "relative",
          zIndex: 10,
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
    </section>
  );
}
        function LegacyOficinaRedirect() {
        const loc = useLocation();
  // conserva el resto del path, query y hash
        const rest = loc.pathname.replace(/^\/oficina/, "");
         return (
          <Navigate
         to={`/oficinaVirtual${rest}${loc.search}${loc.hash}`}
        replace
    />
  );
}

/* ────────────────────────────────────────────────
   AppContent
   - Maneja rutas públicas y oficina virtual
   - Controla navbar / noticias / footer
   - Inyecta la burbuja flotante global (ver más abajo)
──────────────────────────────────────────────── */
function AppContent() {
  // notificaciones push
  useFirebaseMessaging((payload) => {
    console.log("📩 Notificación vía FCM:", payload);
  });

  const { user, loading, abrirLogin } = useAuth() || {};
  const location = useLocation();

  // Ruta actual
  const enOficinaVirtual = /^\/oficinaVirtual(\/|$)/.test(location.pathname);
  const enLitisBotFull = location.pathname === "/litisbot";
  const mostrarBotonNoticias = location.pathname === "/";

  // bloque de biblioteca protegida
  function BibliotecaProtegida() {
    if (loading) {
      return <div className="text-center mt-16">Verificando acceso...</div>;
    }
    if (!user) {
      return (
        <div className="text-center p-10">
          <p>Inicia sesión para acceder a la Biblioteca Jurídica.</p>

          <button
            onClick={abrirLogin}
            className="bg-[#a52e00] text-white px-4 py-2 rounded shadow"
          >
            Iniciar sesión
          </button>

          <div className="mt-2 text-sm text-center">
            <button
              onClick={() => abrirLogin("recuperar")}
              className="text-blue-700 underline"
            >
              ¿Olvidaste tu contraseña?
            </button>
          </div>
        </div>
      );
    }
    return <BibliotecaJ />;
  }

  return (
    <div
      className="relative min-h-screen w-full text-[#5C2E0B]"
      style={{ backgroundColor: "#fff" }}
    >
      {/* BLOQUE PÚBLICO (NO oficina virtual) */}
      {!enOficinaVirtual && (
        <>
          {/* Navbar global: se oculta SOLO en /litisbot (porque ahí vamos fullscreen) */}
          {!enLitisBotFull && <Navbar />}

          <div className={`flex ${!enLitisBotFull ? "pt-20" : ""}`}>
            {/* CONTENIDO PRINCIPAL */}
            <main
              className={`flex-1 w-full min-w-0 ${
                !enLitisBotFull ? "lg:pr-80" : ""
              }`}
            >
              <Routes>
                <Route path="/" element={<Home />} />

                {/* redirecciones legacy /oficina → /oficinaVirtual */}
                <Route path="/oficina" element={<Navigate to="/oficinaVirtual" replace />} />
                <Route path="/oficina/*" element={<LegacyOficinaRedirect />} />


                <Route path="/servicios" element={<Servicios />} />
                <Route path="/contacto" element={<Contacto />} />

                <Route path="/biblioteca" element={<BibliotecaProtegida />} />
                <Route path="/biblioteca-drive" element={<BibliotecaDrive />} />

                <Route path="/recuperar" element={<RecuperarPassword />} />
                <Route path="/blog" element={<Blog />} />
                <Route path="/blog/:id" element={<ArticuloBlog />} />

                <Route path="/jurisprudencia" element={<Jurisprudencia />} />
                <Route
                  path="/jurisprudencia/visor/:id"
                  element={<JurisprudenciaVisorModal />}
                />

                <Route path="/codigos" element={<Codigos />} />
                <Route path="/codigos/:id" element={<CodigoDetalle />} />

                <Route path="/noticias" element={<NoticiasHome />} />

                {/* Chat IA pantalla completa */}
                <Route path="/litisbot" element={<LitisBotPageIntegrada />} />

                <Route path="/nosotros" element={<Nosotros />} />
                <Route path="/login" element={<Login />} />

                <Route
                  path="/historial-archivos"
                  element={<HistorialArchivos />}
                />

                <Route
                  path="/perfil"
                  element={
                    <RutaPrivada>
                      <Perfil />
                    </RutaPrivada>
                  }
                />

                <Route
                  path="/mi-cuenta"
                  element={
                    <RutaPrivada>
                      <MiCuenta />
                    </RutaPrivada>
                  }
                />

                {/* Admin */}
                <Route path="/admin/login" element={<LoginAdmin />} />
                <Route
                  path="/admin"
                  element={
                    <RutaPrivada redir="/admin/login">
                      <DashboardAdmin />
                    </RutaPrivada>
                  }
                />
                <Route
                  path="/admin/libros"
                  element={
                    <RutaPrivada>
                      <SubirLibro />
                    </RutaPrivada>
                  }
                />
                <Route
                  path="/admin/consultas"
                  element={
                    <RutaPrivada>
                      <ConsultasAdmin />
                    </RutaPrivada>
                  }
                />
                <Route
                  path="/admin/publicar-articulo"
                  element={
                    <RutaPrivada>
                      <PublicarArticulo />
                    </RutaPrivada>
                  }
                />
                <Route
                  path="/admin/servicios"
                  element={
                    <RutaPrivada>
                      <ServiciosAdmin />
                    </RutaPrivada>
                  }
                />

                {/* OficinaVirtual config personalización pública/directa */}
                <Route
                  path="/oficinaVirtual/personalizacion"
                  element={<PersonalizacionView />}
                />

                {/* Legal */}
                <Route
                  path="/legal/politica-de-privacidad"
                  element={<PoliticaPrivacidad />}
                />
                <Route
                  path="/legal/terminos-y-condiciones"
                  element={<TerminosCondiciones />}
                />
                <Route
                  path="/legal/aviso-cookies"
                  element={<AvisoCookies />}
                />

                {/* Planes / landing */}
                <Route path="/planes" element={<PricingPage />} />
                <Route path="/saas" element={<LandingSaaS />} />

                {/* Otros */}
                <Route path="/chat-test" element={<ChatTest />} />
                <Route
                  path="/servicios/:slug"
                  element={<ServicioDetalle />}
                />

                <Route path="/seed-branding" element={<SeedBrandingPage />} />
                <Route path="/prueba-noticias" element={<PruebaNoticias />} />

                {/* 404 fallback */}
                <Route path="*" element={<Error404 />} />
              </Routes>
            </main>

            {/* COLUMNA DE NOTICIAS EN ESCRITORIO (oculta en /litisbot) */}
            {!enLitisBotFull && (
              <>
                <div className="hidden lg:flex flex-col w-80 h-[calc(100vh-80px)] fixed top-20 right-0 z-40 overflow-y-auto bg-white/0">
                  <ClientOnly>
                    <NoticiasSlider />
                  </ClientOnly>
                </div>

                {/* Botón flotante de noticias SOLO en home "/" */}
                {mostrarBotonNoticias && (
                  <ClientOnly>
                    <NoticiasBotonFlotante
                      endpoint="general"
                      titulo="Noticias"
                    />
                  </ClientOnly>
                )}
              </>
            )}
          </div>

          {/* FOOTER + MODALES GLOBALES (se ocultan en /litisbot para no romper el fullscreen) */}
          {!enLitisBotFull && <Footer />}

          <ClientOnly>
            <CookiesBanner />
            <ModalLogin />
          </ClientOnly>
        </>
      )}

      {/* BLOQUE OFICINA VIRTUAL */}
      {enOficinaVirtual && (
        <OficinaVirtualLayout>
          <Routes>
            <Route path="/oficinaVirtual" element={<Oficina />} />
            <Route
              path="/oficinaVirtual/casilla-expedientes"
              element={<CasillaExpedientes />}
            />
            <Route
              path="/oficinaVirtual/expediente-jud/:id"
              element={<ExpedienteJudicialDetalle />}
            />
            <Route
              path="/oficinaVirtual/expediente-adm/:id"
              element={<ExpedienteAdministrativoDetalle />}
            />
            <Route
              path="/oficinaVirtual/expedientes/:expedienteId"
              element={<ExpedienteDetalle />}
            />
            <Route
              path="/oficinaVirtual/biblioteca"
              element={<Biblioteca />}
            />
            <Route path="/oficinaVirtual/agenda" element={<Agenda />} />
            <Route
              path="/oficinaVirtual/litisbot"
              element={<LitisBotAudienciaPage />}
            />
            <Route
              path="/oficinaVirtual/firmar-escrito"
              element={<FirmarEscrito />}
            />
            <Route
              path="/oficinaVirtual/notificaciones"
              element={<Notificaciones />}
            />
            <Route
              path="/oficinaVirtual/noticias"
              element={<NoticiasOficina />}
            />
            <Route path="/oficinaVirtual/perfil" element={<Perfil />} />
            <Route
              path="/oficinaVirtual/hazte-conocido"
              element={<HazteConocido />}
            />
            <Route
              path="/oficinaVirtual/calculadora-laboral"
              element={<CalculadoraLaboral />}
            />
            <Route
              path="/oficinaVirtual/*"
              element={<OficinaVirtualRoutes />}
            />
            <Route path="*" element={<Oficina />} />
          </Routes>
        </OficinaVirtualLayout>
      )}
    </div>
  );
}

/* ────────────────────────────────────────────────
   Burbuja flotante global LitisBotBubbleChat
   - Se oculta en /litisbot (pantalla completa ya abierta)
   - Se oculta en /oficinaVirtual/litisbot (sala de audiencia)
──────────────────────────────────────────────── */
function BubbleWithUser() {
  const { user } = useAuth() || {};
  const location = useLocation();

  const ocultarBurbujas =
    /^\/litisbot(\/|$)/.test(location.pathname) ||
    /^\/oficinaVirtual\/litisbot(\/|$)/.test(location.pathname);

  if (ocultarBurbujas) return null;

  return (
    <LitisBotBubbleChat
      usuarioId={user?.uid || "invitado"}
      pro={!!user?.pro}
    />
  );
}

/* ────────────────────────────────────────────────
   App root con todos los Providers y el Router
──────────────────────────────────────────────── */
export default function App() {
  return (
    <GoogleAuthRootProvider>
      <LitisBotChatProvider>
        <NoticiasProvider>
          <AuthProvider>
            <LitisBotProvider>
              <ToastProvider>
                <Router>
                  <AppContent />
                  {/* Burbuja IA flotante en todas partes salvo donde ya hay chat grande */}
                  <ClientOnly>
                    <BubbleWithUser />
                  </ClientOnly>
                </Router>
              </ToastProvider>
            </LitisBotProvider>
          </AuthProvider>
        </NoticiasProvider>
      </LitisBotChatProvider>
    </GoogleAuthRootProvider>
  );
}
