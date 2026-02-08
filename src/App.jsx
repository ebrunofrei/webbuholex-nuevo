import React, { useEffect, useMemo, useState } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  Outlet,
  useLocation,
} from "react-router-dom";
import "./app-layout.css";

/* =========================
   Páginas públicas
========================= */
import SeedBrandingPage from "@/pages/SeedBrandingPage";
import Home from "./pages/Home";
import Servicios from "./pages/Servicios";
import ServicioDetalle from "@/pages/ServicioDetalle";
import Contacto from "./pages/Contacto";
import Blog from "./pages/Blog";
import ArticuloBlog from "./pages/ArticuloBlog";
import Nosotros from "./pages/Nosotros";
import Codigos from "./pages/Codigos";
import CodigoDetalle from "./pages/CodigoDetalle";
import NoticiasHome from "./pages/Noticias";
import PruebaNoticias from "@/pages/PruebaNoticias";
import Jurisprudencia from "@/pages/Jurisprudencia";
import JurisprudenciaVisorModal from "@/components/jurisprudencia/JurisprudenciaVisorModal";
import { GeneralChatProvider } from "@/components/litisbot/chat/general/GeneralChatProvider";
import GeneralChatLayout from "@/components/litisbot/chat/general/GeneralChatLayout";

import Login from "./pages/Login";
import RecuperarPassword from "./components/RecuperarPassword";
import MiCuenta from "./pages/MiCuenta";
import HistorialArchivos from "./pages/HistorialArchivos";
import BibliotecaJ from "./pages/Biblioteca";
import BibliotecaDrive from "./components/BibliotecaDrive";

import PoliticaPrivacidad from "@/pages/legal/politica-de-privacidad";
import TerminosCondiciones from "@/pages/legal/terminos-y-condiciones";
import AvisoCookies from "@/pages/legal/aviso-cookies";

import PricingPage from "./pages/PricingPage";
import LandingSaaS from "./pages/LandingSaaS";

import Error404 from "./pages/Error404";

/* =========================
   Admin
========================= */
import LoginAdmin from "./pages/admin/LoginAdmin";
import DashboardAdmin from "./pages/admin/DashboardAdmin";
import SubirLibro from "./pages/admin/SubirLibro";
import ConsultasAdmin from "./pages/admin/ConsultasAdmin";
import PublicarArticulo from "./pages/admin/PublicarArticulo";
import ServiciosAdmin from "@/pages/admin/ServiciosAdmin";

/* =========================
   Contextos / Providers
========================= */
import { AuthProvider, useAuth } from "./context/AuthContext";
import { LitisBotProvider } from "./context/LitisBotContext";
import { ToastProvider } from "@/components/ui/use-toast";
import { CaseProvider } from "@/context/CaseContext";

/* =========================
   Componentes generales
========================= */
import Navbar from "./components/ui/Navbar";
import Footer from "./components/Footer";
import RutaPrivada from "./components/RutaPrivada";
import NoticiasSlider from "./components/NoticiasSlider";
import ModalLogin from "./components/ModalLogin";
import CookiesBanner from "@/components/CookiesBanner";
import RequireAuth from "@/components/auth/RequireAuth";
import ToastManager from "@/components/ui/ToastManager";

/* =========================
   Oficina virtual
========================= */
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
import LitisBotChatProPage from "./oficinaVirtual/pages/escritorio/LitisBotChatProPage";
import PersonalizacionView from "./views/PersonalizacionView";

/* =========================
   Chat IA pantalla completa
========================= */
import LitisBotChatBase from "@/components/LitisBotChatBase";

/* Burbuja flotante IA global */
import BubbleProvider from "@/components/litisbot/chat/bubble/BubbleProvider";

import { useMembership } from "@/hooks/useMembership";

/* FCM hook */
import { useFirebaseMessaging } from "@/hooks/useFirebaseMessaging";

/* Icono botón mobile */
import { FolderKanban } from "lucide-react";

/* =========================
   Helpers
========================= */
function ClientOnly({ children }) {
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  return ready ? <>{children}</> : null;
}

function isPathInAny(path = "", list = []) {
  const p = (path || "").toLowerCase();
  return list.some((x) => p === x || p.startsWith(`${x}/`));
}

/* =========================
   Layouts
========================= */
function OficinaVirtualLayout() {
  return (
    <div className="w-full min-h-screen flex bg-[#F7F7FA]">
      <aside className="flex-shrink-0">
        <Sidebar />
      </aside>

      <main className="flex-1 min-w-0 py-6">
        <Outlet />
      </main>
    </div>
  );
}

function ChatProLayout() {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev || "";
    };
  }, []);

  return (
    <div className="w-full h-[100dvh] overflow-hidden bg-white">
      <Outlet />
    </div>
  );
}

/* =========================
   LitisBot Page Integrada
========================= */
function LitisBotPageIntegrada() {
  const [casos, setCasos] = useState([]);
  const [casoActivo, setCasoActivo] = useState(null);
  const [showModalHerramientas, setShowModalHerramientas] = useState(false);
  const [sidebarOpenMobile, setSidebarOpenMobile] = useState(false);

  const { user } = useAuth() || {};
  const userInfo = user || { nombre: "Invitado", pro: false };

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = sidebarOpenMobile ? "hidden" : prev || "";
    return () => {
      document.body.style.overflow = prev || "";
    };
  }, [sidebarOpenMobile]);

  return (
    <section
      className="flex w-full bg-white text-[#5C2E0B]"
      style={{ minHeight: "100dvh", maxHeight: "100dvh", overflow: "hidden" }}
    >
      {/* Desktop sidebar */}
      <aside
        className="hidden lg:flex flex-col flex-shrink-0 border-r border-[#f4e6c7] bg-white"
        style={{ width: "300px", height: "100dvh" }}
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

      {/* Mobile button */}
      {!sidebarOpenMobile && (
        <button
          className="lg:hidden fixed left-4 z-[300] rounded-full shadow-xl active:scale-95 flex items-center justify-center text-white"
          style={{
            bottom: "calc(env(safe-area-inset-bottom,0px) + 88px)",
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

      {/* Mobile drawer */}
      {sidebarOpenMobile && (
        <>
          <div
            className="fixed inset-0 bg-black/40 z-[200] lg:hidden"
            onClick={() => setSidebarOpenMobile(false)}
          />
          <aside
            className="fixed right-0 top-0 lg:hidden flex flex-col w-[80vw] max-w-[320px] h-[100dvh] bg-white shadow-2xl border-l border-[#f4e6c7] z-[210]"
            style={{ WebkitOverflowScrolling: "touch", overflowY: "auto" }}
          >
            <SidebarChats
              casos={casos}
              setCasos={setCasos}
              casoActivo={casoActivo}
              setCasoActivo={setCasoActivo}
              user={userInfo}
              onOpenHerramientas={() => {
                setShowModalHerramientas(true);
                setSidebarOpenMobile(false);
              }}
              isOpen={sidebarOpenMobile}
              onCloseSidebar={() => setSidebarOpenMobile(false)}
            />
          </aside>
        </>
      )}

      {/* Main chat */}
      <main
        className="flex-1 flex flex-col items-stretch bg-white text-[#5C2E0B]"
        style={{
          minWidth: 0,
          height: "100dvh",
          maxHeight: "100dvh",
          overflowY: "auto",
          WebkitOverflowScrolling: "touch",
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

/* =========================
   Legacy redirect /oficina → /oficinaVirtual
========================= */
function LegacyOficinaRedirect() {
  const loc = useLocation();
  const rest = loc.pathname.replace(/^\/oficina/i, "");
  return <Navigate to={`/oficinaVirtual${rest}${loc.search}${loc.hash}`} replace />;
}

/* =========================
   AppContent
========================= */
function AppContent() {
  useFirebaseMessaging((payload) => {
    console.log("📩 Notificación vía FCM:", payload);
  });

  const { user, loading, abrirLogin } = useAuth() || {};
  const location = useLocation();

  const path = (location.pathname || "").toLowerCase();
  const enOficinaVirtual = path.startsWith("/oficinavirtual");
  const enLitisBotFull = path === "/litisbot";
  const enChatPro = path.startsWith("/oficinavirtual/chat-pro");

  // ✅ Hooks SIEMPRE arriba (no dentro del JSX)
  const membership = useMembership();
  const isProMember = Boolean(membership?.isPro);

  // ✅ Gobernanza de la burbuja (no aparece en ChatPro ni en /litisbot)
  const shouldShowBubble = Boolean(user) && !enLitisBotFull && !enChatPro;

  
  function BibliotecaProtegida() {
    if (loading) return <div className="text-center mt-16">Verificando acceso...</div>;

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
            <button onClick={() => abrirLogin("recuperar")} className="text-blue-700 underline">
              ¿Olvidaste tu contraseña?
            </button>
          </div>
        </div>
      );
    }

    return <BibliotecaJ />;
  }

  return (
    <div className="relative min-h-screen w-full text-[#5C2E0B]" style={{ backgroundColor: "#fff" }}>
      {/* Top chrome */}
      {!enOficinaVirtual && !enLitisBotFull && <Navbar />}

      <div className={`flex ${!enOficinaVirtual && !enLitisBotFull ? "pt-20" : ""}`}>
        <main className={`flex-1 w-full min-w-0 ${!enOficinaVirtual && !enLitisBotFull ? "lg:pr-80" : ""}`}>
          <Routes>
            {/* ================= PUBLICO ================= */}
            <Route path="/" element={<Home />} />

            {/* ================= LITISBOT DEMO PUBLICO ================= */}
            <Route
              path="/litisbot"
              element={
                <GeneralChatProvider
                  user={{ uid: "invitado", displayName: "Invitado" }}
                >
                  <GeneralChatLayout />
                </GeneralChatProvider>
              }
            />

            {/* Legacy */}
            <Route path="/oficina" element={<Navigate to="/oficinaVirtual" replace />} />
            <Route path="/oficina/*" element={<LegacyOficinaRedirect />} />

            {/* Site */}
            <Route path="/servicios" element={<Servicios />} />
            <Route path="/servicios/:slug" element={<ServicioDetalle />} />
            <Route path="/contacto" element={<Contacto />} />
            <Route path="/nosotros" element={<Nosotros />} />
            <Route path="/blog" element={<Blog />} />
            <Route path="/blog/:id" element={<ArticuloBlog />} />

            {/* Biblioteca pública protegida */}
            <Route path="/biblioteca" element={<BibliotecaProtegida />} />
            <Route path="/biblioteca-drive" element={<BibliotecaDrive />} />
            <Route path="/recuperar" element={<RecuperarPassword />} />

            {/* Jurisprudencia */}
            <Route path="/jurisprudencia" element={<Jurisprudencia />} />
            <Route path="/jurisprudencia/visor/:id" element={<JurisprudenciaVisorModal />} />

            {/* Códigos / noticias */}
            <Route path="/codigos" element={<Codigos />} />
            <Route path="/codigos/:id" element={<CodigoDetalle />} />
            <Route path="/noticias" element={<NoticiasHome />} />
            <Route path="/prueba-noticias" element={<PruebaNoticias />} />

            {/* Auth / cuenta */}
            <Route path="/login" element={<Login />} />
            <Route path="/historial-archivos" element={<HistorialArchivos />} />

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

            {/* Legal */}
            <Route path="/legal/politica-de-privacidad" element={<PoliticaPrivacidad />} />
            <Route path="/legal/terminos-y-condiciones" element={<TerminosCondiciones />} />
            <Route path="/legal/aviso-cookies" element={<AvisoCookies />} />

            {/* Planes / landing */}
            <Route path="/planes" element={<PricingPage />} />
            <Route path="/saas" element={<LandingSaaS />} />
            <Route path="/seed-branding" element={<SeedBrandingPage />} />

            {/* ================= ADMIN ================= */}
            <Route path="/admin/login" element={<LoginAdmin />} />
            <Route
              path="/admin"
              element={
                <RutaPrivada redir="/admin/login">
                  <DashboardAdmin />
                </RutaPrivada>
              }
            />
            <Route path="/admin/libros" element={<RutaPrivada><SubirLibro /></RutaPrivada>} />
            <Route path="/admin/consultas" element={<RutaPrivada><ConsultasAdmin /></RutaPrivada>} />
            <Route path="/admin/publicar-articulo" element={<RutaPrivada><PublicarArticulo /></RutaPrivada>} />
            <Route path="/admin/servicios" element={<RutaPrivada><ServiciosAdmin /></RutaPrivada>} />

            {/* ================= OFICINA VIRTUAL ================= */}
            {/* Config pública */}
            <Route path="/oficinaVirtual/personalizacion" element={<PersonalizacionView />} />

            {/* ChatPro standalone */}
            <Route
              path="/oficinaVirtual/chat-pro"
              element={
                <RequireAuth>
                  <ChatProLayout />
                </RequireAuth>
              }
            >
              <Route index element={<LitisBotChatProPage />} />
            </Route>

            {/* OficinaVirtual nested */}
            <Route
              path="/oficinaVirtual"
              element={
                <RequireAuth>
                  <OficinaVirtualLayout />
                </RequireAuth>
              }
            >
              <Route index element={<Oficina />} />
              <Route path="casilla-expedientes" element={<CasillaExpedientes />} />
              <Route path="expediente-jud/:id" element={<ExpedienteJudicialDetalle />} />
              <Route path="expediente-adm/:id" element={<ExpedienteAdministrativoDetalle />} />
              <Route path="expedientes/:expedienteId" element={<ExpedienteDetalle />} />
              <Route path="biblioteca" element={<Biblioteca />} />
              <Route path="agenda" element={<Agenda />} />
              <Route path="litisbot" element={<LitisBotAudienciaPage />} />
              <Route path="firmar-escrito" element={<FirmarEscrito />} />
              <Route path="notificaciones" element={<Notificaciones />} />
              <Route path="noticias" element={<NoticiasOficina />} />
              <Route path="perfil" element={<Perfil />} />
              <Route path="hazte-conocido" element={<HazteConocido />} />
              <Route path="calculadora-laboral" element={<CalculadoraLaboral />} />
              <Route path="*" element={<OficinaVirtualRoutes />} />
            </Route>

            {/* 404 */}
            <Route path="*" element={<Error404 />} />
          </Routes>
        </main>

        {/* Right rail */}
        {!enOficinaVirtual && !enLitisBotFull && (
          <div className="hidden lg:flex flex-col w-80 h-[calc(100vh-80px)] fixed top-20 right-0 z-40 overflow-y-auto bg-white/0">
            <ClientOnly>
              <NoticiasSlider />
            </ClientOnly>
          </div>
        )}
      </div>

      {/* Footer + global modals */}
      {!enOficinaVirtual && !enLitisBotFull && <Footer />}

      {!enOficinaVirtual && (
        <ClientOnly>
          <CookiesBanner />
          <ModalLogin />
        </ClientOnly>
      )}

      {/* Burbuja flotante global (Bubble SaaS) */}
      {shouldShowBubble && (
        <BubbleProvider
          usuarioId={user.uid}
          pro={isProMember}
          jurisSeleccionada={null}
        />
      )}
    </div>
  );
}

/* =========================
   App Root (sin Google)
========================= */
export default function App() {
  return (
    <AuthProvider>
      <CaseProvider>
      <LitisBotProvider>
        <ToastProvider>
          <Router>
            <AppContent />
            <ClientOnly>
              <ToastManager />
            </ClientOnly>
          </Router>
        </ToastProvider>
      </LitisBotProvider>
      </CaseProvider>
    </AuthProvider>
  );
}
