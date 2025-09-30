// src/routes/ProtectedRoute.jsx
import React, { useEffect } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import EmailVerificationModal from "@components/ui/EmailVerificationModal";

const MINUTES_TO_VERIFY = 15;

export default function ProtectedRoute({ children }) {
  const { user, loading, emailVerificado, cerrarSesion } = useAuth();
  const location = useLocation();

  // Timer autocierre si no verifica
  useEffect(() => {
    let timer;
    if (user && !user.isAnonymous && !(user.emailVerified || emailVerificado)) {
      timer = setTimeout(async () => {
        try {
          await cerrarSesion();
          console.warn(
            "Sesión cerrada automáticamente por falta de verificación de correo."
          );
          // 🔔 Aquí puedes disparar un toast en vez de alert
        } catch (err) {
          console.error("Error al cerrar sesión automáticamente:", err);
        }
      }, MINUTES_TO_VERIFY * 60 * 1000);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [user, emailVerificado, cerrarSesion]);

  // Mientras carga el estado de autenticación
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-[#b03a1a] font-bold">
        Cargando...
      </div>
    );
  }

  // Si no está logueado o es anónimo → redirigir a login
  if (!user || user.isAnonymous) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Si está logueado pero no verificó el correo → modal bloqueante
  if (!(user.emailVerified || emailVerificado)) {
    return (
      <>
        <EmailVerificationModal open />
        <div className="fixed inset-0 z-[110] bg-black/30" />
      </>
    );
  }

  // Acceso permitido
  return children;
}
