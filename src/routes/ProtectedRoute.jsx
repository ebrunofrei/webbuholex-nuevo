// ============================================================================
// 🔐 ProtectedRoute — Guardia de acceso (Enterprise Safe)
// ----------------------------------------------------------------------------
// - No depende de Firebase directamente
// - Un solo timer de verificación
// - UX limpia (sin alert())
// - Coordinado con AuthContext + EmailVerificationModal
// ============================================================================

import React, { useEffect, useRef } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import EmailVerificationModal from "@/components/ui/EmailVerificationModal";

// ⏱️ Tiempo máximo para verificar correo
const MINUTES_TO_VERIFY = 15;

export default function ProtectedRoute({ children }) {
  const { user, loading, emailVerificado, cerrarSesion } = useAuth();
  const location = useLocation();

  const verificationTimerRef = useRef(null);

  // --------------------------------------------------------------------------
  // ⏳ Timer único de autocierre si no verifica correo
  // --------------------------------------------------------------------------
  useEffect(() => {
    // Limpiar cualquier timer previo
    if (verificationTimerRef.current) {
      clearTimeout(verificationTimerRef.current);
      verificationTimerRef.current = null;
    }

    // Condición estricta: usuario logueado y NO verificado
    if (user && !emailVerificado) {
      verificationTimerRef.current = setTimeout(() => {
        cerrarSesion();
      }, MINUTES_TO_VERIFY * 60 * 1000);
    }

    return () => {
      if (verificationTimerRef.current) {
        clearTimeout(verificationTimerRef.current);
        verificationTimerRef.current = null;
      }
    };
  }, [user, emailVerificado, cerrarSesion]);

  // --------------------------------------------------------------------------
  // ⏳ Estado de carga global
  // --------------------------------------------------------------------------
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-black/60">
        Cargando…
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // 🚫 No autenticado
  // --------------------------------------------------------------------------
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // --------------------------------------------------------------------------
  // ✉️ Autenticado pero NO verificado
  // (modal bloqueante)
  // --------------------------------------------------------------------------
  if (!emailVerificado) {
    return <EmailVerificationModal open />;
  }

  // --------------------------------------------------------------------------
  // ✅ Acceso permitido
  // --------------------------------------------------------------------------
  return children;
}
