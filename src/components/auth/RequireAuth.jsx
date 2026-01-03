// src/components/auth/RequireAuth.jsx
import React, { useEffect } from "react";
import { useAuth } from "@/context/AuthContext";

export default function RequireAuth({ children }) {
  const { user, loading, abrirModalLogin } = useAuth() || {};

  // Si está cargando Firebase, esperamos
  if (loading) {
    return (
      <div className="w-full h-screen flex items-center justify-center text-sm text-gray-600">
        Verificando sesión de tu Oficina Virtual...
      </div>
    );
  }

  // Si NO hay usuario, abrimos el modal de login
  useEffect(() => {
    if (!loading && !user) {
      abrirModalLogin("login");
    }
  }, [loading, user, abrirModalLogin]);

  // Mientras no haya user, mostramos solo el fondo (el modal se encarga)
  if (!user) {
    return (
      <div className="w-full h-screen bg-gray-50 flex items-center justify-center text-sm text-gray-500">
        Para acceder a tu Oficina Virtual necesitas iniciar sesión.
      </div>
    );
  }

  // Usuario autenticado → renderizamos la Oficina normalmente
  return <>{children}</>;
}
