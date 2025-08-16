// src/components/RutaPrivada.jsx
import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { auth } from "../services/firebaseConfig";
import { useAuthState } from "react-firebase-hooks/auth";
// Si quieres usar un modal de login, descomenta la línea de abajo
// import ModalLogin from "./ModalLogin";

/**
 * RutaPrivada
 * @param {ReactNode} children - El contenido protegido.
 * @param {string} [redirectTo] - Ruta donde redirigir si no está autenticado (default: "/login")
 * @param {boolean} [permitirAnonimo] - Permite user anónimo (default: false)
 * @param {boolean} [mostrarModal] - Muestra modal en vez de redirigir (default: false)
 */
export default function RutaPrivada({
  children,
  redirectTo = "/login",
  permitirAnonimo = false,
  mostrarModal = false,
}) {
  const [user, loading, error] = useAuthState(auth);
  const location = useLocation();

  // Loader elegante mientras verifica sesión
  if (loading) {
    return (
      <div className="flex justify-center items-center h-56">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-red-600 mr-4"></div>
        <span className="text-gray-700 text-lg">Verificando acceso seguro...</span>
      </div>
    );
  }

  // Si hay error de autenticación
  if (error) {
    return (
      <div className="text-center mt-12 text-red-600">
        <p>Ocurrió un error verificando tu sesión.</p>
        <p className="text-xs">{error.message}</p>
        <button onClick={() => window.location.reload()} className="mt-4 px-4 py-1 bg-gray-200 rounded">
          Recargar página
        </button>
      </div>
    );
  }

  // Si no hay user o es anónimo (según configuración)
  if (!user || (!permitirAnonimo && user.isAnonymous)) {
    // Mostrar modal de login en vez de redirigir (si está implementado)
    // if (mostrarModal) return <ModalLogin mensaje="Inicia sesión para acceder a esta sección." />;

    // Redirige a la ruta indicada y guarda desde dónde vino (para volver luego)
    return (
      <Navigate
        to={redirectTo}
        replace
        state={{ from: location }}
      />
    );
  }

  // Usuario autenticado (o anónimo si está permitido): muestra contenido protegido
  return children;
}
