import React, { useEffect } from "react";
import { useAuth } from "@/context/AuthContext";

export default function RequireAuth({ children }) {
  const auth = useAuth() || {};
  const { user, loading, abrirModalLogin } = auth;

  // ✅ EFECTOS SIEMPRE ARRIBA (regla de hooks)
  useEffect(() => {
    if (!loading && !user) {
      abrirModalLogin?.("login");
    }
  }, [loading, user, abrirModalLogin]);

  // ⏳ Cargando sesión
  if (loading) {
    return (
      <div className="w-full h-screen flex items-center justify-center text-sm text-gray-600">
        Verificando sesión de tu Oficina Virtual...
      </div>
    );
  }

  // 🔒 No autenticado (el modal ya fue disparado)
  if (!user) {
    return (
      <div className="w-full h-screen bg-gray-50 flex items-center justify-center text-sm text-gray-500">
        Para acceder a tu Oficina Virtual necesitas iniciar sesión.
      </div>
    );
  }

  // ✅ Autenticado
  return <>{children}</>;
}
