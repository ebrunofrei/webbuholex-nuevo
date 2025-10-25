// src/App.jsx
import React, { useEffect, useState } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";

import SeedBrandingPage from "@/pages/SeedBrandingPage";

// CONTEXTOS
import { LitisBotChatProvider } from "./context/LitisBotChatContext";
import { NoticiasProvider } from "./context/NoticiasContext";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { LitisBotProvider } from "./context/LitisBotContext";
import { ToastProvider } from "@/components/ui/use-toast";
import { GoogleAuthRootProvider } from "@/context/GoogleAuthContext";

// COMPONENTES GENERALES
import Navbar from "./components/ui/Navbar";
import Footer from "./components/Footer";
import RutaPrivada from "./components/RutaPrivada";
import NoticiasSlider from "./components/NoticiasSlider";
import NoticiasBotonFlotante from "./components/ui/NoticiasBotonFlotante";
import ModalLogin from "./components/ModalLogin";
import RecuperarPassword from "./components/RecuperarPassword";
import PersonalizacionView from "./views/PersonalizacionView";

// LITISBOT
import SidebarChats from "@/components/SidebarChats";
import LitisBotChatBase from "@/components/LitisBotChatBase";

// OFICINA VIRTUAL MODULAR
import Sidebar from "./components/Sidebar";
import Oficina from "@/oficinaVirtual/pages/Oficina";
import ListaExpedientes from "./oficinaVirtual/components/ListaExpedientes";
import Expedientes from "./oficinaVirtual/pages/Expedientes";
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
import ConfigurarAlertas from "@/oficinaVirtual/components/ConfigurarAlertas";
import CalculadoraLaboral from "@/oficinaVirtual/pages/CalculadoraLaboral";

// PÁGINAS PÚBLICAS Y ADMIN
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
import LitisBotBubbleChat from "@/components/ui/LitisBotBubbleChat";
import PoliticaPrivacidad from "@/pages/legal/politica-de-privacidad";
import TerminosCondiciones from "@/pages/legal/terminos-y-condiciones";
import AvisoCookies from "@/pages/legal/aviso-cookies";
import CookiesBanner from "@/components/CookiesBanner";
import PricingPage from "./pages/PricingPage";
import LandingSaaS from "./pages/LandingSaaS";
import ChatTest from "@/components/ChatTest";
import ServicioDetalle from "@/pages/ServicioDetalle";
import ServiciosAdmin from "@/pages/admin/ServiciosAdmin";

// 🔔 Hook centralizado para FCM
import { useFirebaseMessaging } from "@/hooks/useFirebaseMessaging";

// Ícono botón móvil (abrir lista de casos)
import { FolderKanban } from "lucide-react";

/* ──────────────────────────────────────────────────────────
   Helper: montar hijos solo en cliente (evita hydration)
   ────────────────────────────────────────────────────────── */
function ClientOnly({ children }) {
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  return ready ? <>{children}</> : null;
}

/* ──────────────────────────────────────────────────────────
   Layout de Oficina Virtual (sidebar escritorio)
   ────────────────────────────────────────────────────────── */
function OficinaVirtualLayout({ children }) {
  return (
    <div className="min-h-screen flex bg-gray-50">
      <Sidebar />
      <main className="flex-1 bg-gray-50 p-4 min-w-0">{children}</main>
    </div>
  );
}

/* ============================================================
   LitisBotPageIntegrada
   - Pantalla del chat en /litisbot
   - Mejora mobile:
     • Usa 100dvh para que realmente llene el alto en móviles.
     • El botón flotante de casos (📂) se mueve ABAJO-IZQ para no tapar el mensaje.
     • Drawer lateral ocupa 100dvh y bloquea scroll del body cuando está abierto.
     • Sidebar fijo en desktop sigue igual.
============================================================ */
function LitisBotPageIntegrada() {
  const [casos, setCasos] = React.useState([]);
  const [casoActivo, setCasoActivo] = React.useState(null);
  const [showModalHerramientas, setShowModalHerramientas] =
    React.useState(false);

  // Drawer móvil
  const [sidebarOpenMobile, setSidebarOpenMobile] = React.useState(false);

  const { user } = useAuth() || {};
  const userInfo = user || { nombre: "Invitado", pro: false };

  // Bloquear scroll del body cuando el drawer esté abierto
  React.useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = sidebarOpenMobile ? "hidden" : prev || "";
    return () => {
      document.body.style.overflow = prev || "";
    };
  }, [sidebarOpenMobile]);

  return (
    <div
      className="flex w-full bg-white text-[#5C2E0B]"
      style={{
        minHeight: "100dvh", // móvil real full viewport
        maxHeight: "100dvh",
        overflow: "hidden", // evitamos doble scroll body + chat
      }}
    >
      {/* Sidebar ESCRITORIO (visible >= lg) */}
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

      {/* Botón flotante MÓVIL para abrir casos (ya NO tapa el mensaje arriba) */}
      {!sidebarOpenMobile && (
        <button
          className="
            lg:hidden
            fixed
            left-4
            bottom-[88px]    /* queda encima de la barra de entrada (~64px) */
            z-[80]
            p-3
            rounded-full
            bg-[#5C2E0B]
            text-white
            shadow-xl
            active:scale-95
          "
          onClick={() => setSidebarOpenMobile(true)}
          aria-label="Abrir lista de casos"
          title="Casos"
          style={{
            // pequeño margen extra por si hay barra segura en iOS
            paddingBottom: "calc(env(safe-area-inset-bottom,0px) / 2)",
          }}
        >
          <FolderKanban size={22} />
        </button>
      )}

      {/* Drawer MÓVIL: lista de casos */}
      {sidebarOpenMobile && (
        <div className="lg:hidden fixed inset-0 z-[90] flex">
          {/* overlay oscuro - click para cerrar */}
          <div
            className="flex-1 bg-black/40"
            onClick={() => setSidebarOpenMobile(false)}
          />
          {/* panel lateral */}
          <aside
            className="w-[80vw] max-w-[320px] h-full bg-white shadow-xl flex flex-col border-r border-[#f4e6c7]"
            style={{
              height: "100dvh", // ocupa toda la altura visible del móvil
            }}
          >
            <SidebarChats
              casos={casos}
              setCasos={setCasos}
              casoActivo={casoActivo}
              setCasoActivo={setCasoActivo}
              user={userInfo}
              onOpenHerramientas={() => setShowModalHerramientas(true)}
              isOpen={sidebarOpenMobile}
              onCloseSidebar={() => setSidebarOpenMobile(false)}
            />
          </aside>
        </div>
      )}

      {/* Área principal del chat */}
      <main
        className="
          flex-1 flex flex-col items-stretch bg-white text-[#5C2E0B]
        "
        style={{
          minWidth: 0,
          height: "100dvh",
          overflowY: "auto", // el scroll vive aquí
          WebkitOverflowScrolling: "touch",
          backgroundColor: "#ffffff",
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

/* ============================================================
   Contenido principal (todas las rutas públicas / oficina virtual)
============================================================ */
function AppContent() {
  // Manejo de notificaciones push (seguro en hook)
  useFirebaseMessaging((payload) => {
    console.log("📩 Notificación recibida via hook:", payload);
  });

  const { user, loading, abrirLogin } = useAuth() || {};
  const location = useLocation();

  // flags de UI según ruta
  const enOficinaVirtual = /^\/oficinaVirtual(\/|$)/.test(location.pathname);
  const hideNavbar = location.pathname === "/litisbot";
  const mostrarBotonNoticias = location.pathname === "/";

  // Gate de biblioteca protegida
  function BibliotecaProtegida() {
    if (loading)
      return <div className="text-center mt-16">Verificando acceso...</div>;
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
      className="relative min-h-screen w-full bg-white text-[#5C2E0B]"
      style={{ background: "#fff" }}
    >
      {/* ==========================
         BLOQUE PUBLICO / HOME / ETC
         (No oficina virtual)
      =========================== */}
      {!enOficinaVirtual && (
        <>
          {/* Navbar global (se oculta sólo en /litisbot para modo fullscreen chat) */}
          {!hideNavbar && <Navbar />}

          <div className={`flex ${!hideNavbar ? "pt-20" : ""}`}>
            {/* CONTENIDO PRINCIPAL */}
            <main
              className={`flex-1 w-full ${
                !hideNavbar ? "lg:pr-80" : ""
              } min-w-0`}
            >
              <Routes>
                <Route path="/" element={<Home />} />
                <Route
                  path="/oficina"
                  element={<Navigate to="/oficinaVirtual" replace />}
                />
                <Route path="/oficina" element={<Oficina />} />
                <Route path="/servicios" element={<Servicios />} />
                <Route path="/contacto" element={<Contacto />} />
                <Route
                  path="/biblioteca"
                  element={<BibliotecaProtegida />}
                />
                <Route
                  path="/biblioteca-drive"
                  element={<BibliotecaDrive />}
                />
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
                  path="/oficinaVirtual/personalizacion"
                  element={<PersonalizacionView />}
                />
                <Route path="/seed-branding" element={<SeedBrandingPage />} />

                {/* Legal */}
                <Route
                  path="/legal/politica-de-privacidad"
                  element={<PoliticaPrivacidad />}
                />
                <Route
                  path="/legal/terminos-y-condiciones"
                  element={<TerminosCondiciones />}
                />
                <Route path="/legal/aviso-cookies" element={<AvisoCookies />} />

                {/* Planes / landing */}
                <Route path="/planes" element={<PricingPage />} />
                <Route path="/planes" element={<LandingSaaS />} />

                {/* Otros */}
                <Route path="/chat-test" element={<ChatTest />} />
                <Route
                  path="/servicios/:slug"
                  element={<ServicioDetalle />}
                />
                <Route
                  path="/admin/servicios"
                  element={
                    <RutaPrivada>
                      <ServiciosAdmin />
                    </RutaPrivada>
                  }
                />

                <Route path="*" element={<Error404 />} />
              </Routes>
            </main>

            {/* SIDEBAR DE NOTICIAS EN ESCRITORIO */}
            {!hideNavbar && (
              <>
                <div className="hidden lg:flex flex-col w-80 h-[calc(100vh-80px)] fixed top-20 right-0 z-40 overflow-y-auto bg-white/0">
                  <ClientOnly>
                    <NoticiasSlider />
                  </ClientOnly>
                </div>

                {/* Botón flotante Noticias solo en Home */}
                {location.pathname === "/" && (
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

          {/* FOOTER + MODALES GLOBALES (solo fuera de /litisbot) */}
          {!hideNavbar && <Footer />}

          <ClientOnly>
            <CookiesBanner />
            <ModalLogin />
          </ClientOnly>
        </>
      )}

      {/* ==========================
         OFICINA VIRTUAL (ruta /oficinaVirtual/*)
      =========================== */}
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

/* ============================================================
   App root con todos los Providers
============================================================ */
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
                  {/* Burbujita flotante LitisBot que aparece en todo menos /litisbot y /oficinaVirtual/litisbot */}
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

/* ============================================================
   Burbuja flotante global (salvo en las pantallas donde ya está el chat grande)
============================================================ */
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
