import React, { useEffect } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import EmailVerificationModal from "../components/ui/EmailVerificationModal";

// Cierra sesión automáticamente si no verifica en X minutos
const MINUTES_TO_VERIFY = 15;

export default function ProtectedRoute({ children }) {
  const { user, loading, emailVerificado, cerrarSesion } = useAuth();
  const location = useLocation();

  // Timer autocierre si no verifica
  useEffect(() => {
    let timer = null;
    if (
      user &&
      !user.isAnonymous &&
      !emailVerificado
    ) {
      timer = setTimeout(async () => {
        await cerrarSesion();
        alert("No verificaste tu correo en el tiempo indicado. Se cerró la sesión.");
      }, MINUTES_TO_VERIFY * 60 * 1000);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
    // eslint-disable-next-line
  }, [user?.emailVerified, user, emailVerificado]);

  // Mientras carga
  if (loading) return <div className="min-h-screen flex items-center justify-center">Cargando...</div>;

  // No logueado
  if (!user || user.isAnonymous) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Logueado pero no verificado (modal bloqueante)
  if (!emailVerificado) {
    return (
      <>
        <EmailVerificationModal open />
        <div className="fixed inset-0 z-[110] bg-black/30"></div>
      </>
    );
  }

  // Acceso permitido
  return children;
}
