// src/App.jsx
import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from "react-router-dom";
import SeedBrandingPage from "@/pages/SeedBrandingPage";

// CONTEXTOS
import { LitisBotChatProvider } from "./context/LitisBotChatContext";
import { NoticiasProvider } from "./context/NoticiasContext";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { LitisBotProvider } from "./context/LitisBotContext";

// COMPONENTES GENERALES
import Navbar from "./components/ui/Navbar";
import Footer from "./components/Footer";
// import InstalarApp from "./components/InstalarApp";
import RutaPrivada from "./components/RutaPrivada";
import NoticiasSlider from "./components/NoticiasSlider";
import NoticiasBotonFlotante from "./components/ui/NoticiasBotonFlotante";
import ModalLogin from "./components/ModalLogin";
import RecuperarPassword from "./components/RecuperarPassword";
import Toast from "./components/ui/Toast";
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
import { GoogleAuthRootProvider } from "@/context/GoogleAuthContext";
import PoliticaPrivacidad from "@/pages/legal/politica-de-privacidad";
import TerminosCondiciones from "@/pages/legal/terminos-y-condiciones";
import AvisoCookies from "@/pages/legal/aviso-cookies";
import CookiesBanner from "@/components/CookiesBanner";
import PricingPage from "./pages/PricingPage";
import LandingSaaS from "./pages/LandingSaaS";

// FIREBASE AUTH + FCM
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { getMessaging, getToken } from "firebase/messaging";
import { app } from "./services/firebaseConfig";
const VAPID_KEY = "BK_FdBKoZZeavWPaEvAjEY5GZDI7gs-Kpt05ctgk4aUfp_mdT-aqDdnaefwu8pMAUvNDTaghKrhDnpI0Ej9PgUU";

// Lógica FCM
function useFirebaseAuthAndFcm() {
  React.useEffect(() => {
    const auth = getAuth(app);
    const messaging = getMessaging(app);
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user && !user.isAnonymous) {
        try {
          if (window.Notification && Notification.permission !== "granted") {
            await Notification.requestPermission();
          }
          const token = await getToken(messaging, { vapidKey: VAPID_KEY });
          if (token) {
            console.log("FCM Token:", token);
          }
        } catch (err) {
          console.warn("No se pudo obtener el token FCM: " + err.message);
        }
      }
    });
    return () => unsub();
  }, []);
}

function OficinaVirtualLayout({ children }) {
  return (
    <div className="min-h-screen flex">
      <Sidebar />
      <main className="flex-1 bg-gray-50 p-4">{children}</main>
    </div>
  );
}

// ---------- LitisBot con Sidebar+Chat ----------
function LitisBotPageIntegrada() {
  const [casos, setCasos] = React.useState([]);
  const [casoActivo, setCasoActivo] = React.useState(null);
  const [showModalHerramientas, setShowModalHerramientas] = React.useState(false);

  const { user } = useAuth() || {};
  const userInfo = user || { nombre: "Invitado", pro: false };

  return (
    <div
      className="flex w-full min-h-screen bg-white"
      style={{
        height: "100vh",
        overflow: "hidden",
      }}
    >
      {/* Sidebar ocupa 320px máximo, pero nunca más del 22% */}
      <div
        className="h-full"
        style={{
          width: "22vw",
          minWidth: 250,
          maxWidth: 350,
          borderRight: "1px solid #f4e6c7",
          background: "#fff",
          display: "flex",
          flexDirection: "column",
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
      </div>
      {/* Chat ocupa el resto */}
      <div
        className="flex-1 flex flex-col items-stretch bg-white"
        style={{
          minWidth: 0,
          height: "100vh",
          overflowY: "auto",
        }}
      >
        <LitisBotChatBase
          user={userInfo}
          casoActivo={casoActivo}
          expedientes={casos}
          showModal={showModalHerramientas}
          setShowModal={setShowModalHerramientas}
        />
      </div>
    </div>
  );
}
// -----------------------------------------------

function AppContent() {
  useFirebaseAuthAndFcm();
  const { user, loading, abrirLogin, toast, setToast } = useAuth?.() || {};
  const location = useLocation();
  const esLitisBot = location.pathname === "/litisbot";
  const enOficinaVirtual = /^\/oficinaVirtual(\/|$)/.test(location.pathname);
  const hideNavbar = location.pathname === "/litisbot";

  // Solo mostrar botón flotante de noticias en Home
  const mostrarBotonNoticias = location.pathname === "/";

  function BibliotecaProtegida() {
    if (loading) return <div className="text-center mt-16">Verificando acceso...</div>;
    if (!user) {
      return (
        <div className="text-center p-10">
          <p>Inicia sesión para acceder a la Biblioteca Jurídica.</p>
          <button onClick={abrirLogin} className="bg-[#a52e00] text-white px-4 py-2 rounded shadow">
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
    <div
      className="relative min-h-screen w-full"
      style={{
        background: "#fff"
      }}
    >
      <Toast toast={toast} setToast={setToast} />
      {!enOficinaVirtual && (
        <>
          {!hideNavbar && <Navbar />}
          <div className="flex pt-20">
            <main className={`flex-1 w-full ${!hideNavbar ? "lg:pr-80" : ""}`}>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/oficina" element={<Navigate to="/oficinaVirtual" replace />} />
                <Route path="/oficina" element={<Oficina />} />
                <Route path="/servicios" element={<Servicios />} />
                <Route path="/contacto" element={<Contacto />} />
                <Route path="/biblioteca" element={<BibliotecaProtegida />} />
                <Route path="/biblioteca-drive" element={<BibliotecaDrive />} />
                <Route path="/recuperar" element={<RecuperarPassword />} />
                <Route path="/blog" element={<Blog />} />
                <Route path="/blog/:id" element={<ArticuloBlog />} />
                <Route path="/jurisprudencia" element={<Jurisprudencia />} />
                <Route path="/jurisprudencia/visor/:id" element={<JurisprudenciaVisorModal />} />
                <Route path="/codigos" element={<Codigos />} />
                <Route path="/codigos/:id" element={<CodigoDetalle />} />
                <Route path="/noticias" element={<NoticiasHome />} />
                <Route path="/litisbot" element={<LitisBotPageIntegrada />} />
                <Route path="/nosotros" element={<Nosotros />} />
                <Route path="/login" element={<Login />} />
                <Route path="/historial-archivos" element={<HistorialArchivos />} />
                <Route path="/perfil" element={<RutaPrivada><Perfil /></RutaPrivada>} />
                <Route path="/mi-cuenta" element={<RutaPrivada><MiCuenta /></RutaPrivada>} />
                <Route path="/admin/login" element={<LoginAdmin />} />
                <Route path="/admin" element={<RutaPrivada redir="/admin/login">{<DashboardAdmin />}</RutaPrivada>} />
                <Route path="/admin/libros" element={<RutaPrivada>{<SubirLibro />}</RutaPrivada>} />
                <Route path="/admin/consultas" element={<RutaPrivada>{<ConsultasAdmin />}</RutaPrivada>} />
                <Route path="/admin/publicar-articulo" element={<RutaPrivada>{<PublicarArticulo />}</RutaPrivada>} />
                <Route path="/oficinaVirtual/personalizacion" element={<PersonalizacionView />} />
                <Route path="/seed-branding" element={<SeedBrandingPage />} />
                <Route path="/legal/politica-de-privacidad" element={<PoliticaPrivacidad />} />
                <Route path="/legal/terminos-y-condiciones" element={<TerminosCondiciones />} />
                <Route path="/legal/aviso-cookies" element={<AvisoCookies />} />
                <Route path="/planes" element={<PricingPage />} />
                <Route path="/planes" element={<LandingSaaS />} />
                <Route path="*" element={<Error404 />} />
              </Routes>
            </main>
            {!hideNavbar && (
              <>
                <aside className="hidden lg:flex flex-col w-80 h-[calc(100vh-80px)] fixed top-20 right-0 z-40">
                  <NoticiasSlider />
                </aside>
                {mostrarBotonNoticias && <NoticiasBotonFlotante />}
                {/* <InstalarApp /> */}
              </>
            )}
          </div>
          {!hideNavbar && <Footer />}
          <CookiesBanner />
          <ModalLogin />
        </>
      )}

      {enOficinaVirtual && (
        <OficinaVirtualLayout>
          <Routes>
            <Route path="/oficinaVirtual" element={<Oficina />} />
            <Route path="/oficinaVirtual/casilla-expedientes" element={<CasillaExpedientes />} />
            <Route path="/oficinaVirtual/expediente-jud/:id" element={<ExpedienteJudicialDetalle />} />
            <Route path="/oficinaVirtual/expediente-adm/:id" element={<ExpedienteAdministrativoDetalle />} />
            <Route path="/oficinaVirtual/expedientes/:expedienteId" element={<ExpedienteDetalle />} />
            <Route path="/oficinaVirtual/biblioteca" element={<Biblioteca />} />
            <Route path="/oficinaVirtual/agenda" element={<Agenda />} />
            <Route path="/oficinaVirtual/litisbot" element={<LitisBotAudienciaPage />} />
            <Route path="/oficinaVirtual/firmar-escrito" element={<FirmarEscrito />} />
            <Route path="/oficinaVirtual/notificaciones" element={<Notificaciones />} />
            <Route path="/oficinaVirtual/noticias" element={<NoticiasOficina />} />
            <Route path="/oficinaVirtual/perfil" element={<Perfil />} />
            <Route path="/oficinaVirtual/hazte-conocido" element={<HazteConocido />} />
            <Route path="/oficinaVirtual/calculadora-laboral" element={<CalculadoraLaboral />} />
            <Route path="/oficinaVirtual/*" element={<OficinaVirtualRoutes />} />
            <Route path="*" element={<Oficina />} />
          </Routes>
        </OficinaVirtualLayout>
      )}
      {/* Ya NO mostramos el botón de noticias aquí globalmente */}
    </div>
  );
}

export default function App() {
  return (
    <GoogleAuthRootProvider>
    <LitisBotChatProvider>
      <NoticiasProvider>
        <AuthProvider>
          <LitisBotProvider>
            <Router>
              <AppContent />
            </Router>
            <LitisBotBubbleChat />
          </LitisBotProvider>
        </AuthProvider>
      </NoticiasProvider>
    </LitisBotChatProvider>
    </GoogleAuthRootProvider>
  );
}
