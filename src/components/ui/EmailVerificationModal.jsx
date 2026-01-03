// ============================================================================
// ✉️ EmailVerificationModal — Verificación de correo (SAFE)
// ----------------------------------------------------------------------------
// - No asume user válido
// - No rompe si se desmonta
// - Usa AuthContext como única fuente
// ============================================================================

import React, { useState, useCallback, useRef } from "react";
import { sendEmailVerification } from "firebase/auth";
import { useAuth } from "@/context/AuthContext";

export default function EmailVerificationModal({ open }) {
  const { user, refrescarUsuario, cerrarSesion } = useAuth();

  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const mountedRef = useRef(true);

  // --------------------------------------------------------------------------
  // Guard de desmontaje
  // --------------------------------------------------------------------------
  React.useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  if (!open || !user) return null;

  // --------------------------------------------------------------------------
  // Reenviar correo de verificación
  // --------------------------------------------------------------------------
  const handleResend = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    setMsg("");

    try {
      // 🔒 Siempre usar el user activo
      await sendEmailVerification(user);

      if (!mountedRef.current) return;

      setMsg("Correo reenviado. Revisa tu bandeja de entrada y spam.");
    } catch (err) {
      if (!mountedRef.current) return;

      setMsg("Error al reenviar el correo de verificación.");
      console.error("EmailVerification:", err);
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [user]);

  // --------------------------------------------------------------------------
  // Confirmar verificación (reload seguro)
  // --------------------------------------------------------------------------
  const handleCheckVerified = useCallback(async () => {
    if (!user) return;

    try {
      await refrescarUsuario();
    } catch (err) {
      console.error("Error refrescando usuario:", err);
    }
  }, [user, refrescarUsuario]);

  // --------------------------------------------------------------------------
  // RENDER
  // --------------------------------------------------------------------------
  return (
    <div className="fixed inset-0 z-[200] bg-black/40 flex items-center justify-center">
      <div className="bg-white max-w-sm w-full p-6 rounded-xl shadow-xl border-2 border-yellow-400 text-center relative">

        <h2 className="text-2xl font-bold text-[#b03a1a] mb-2">
          Verifica tu correo
        </h2>

        <p className="mb-2 text-sm">
          Enviamos un enlace de verificación a:
          <br />
          <b>{user.email}</b>
        </p>

        <p className="text-yellow-700 text-sm mb-4">
          Debes verificar tu correo electrónico para continuar.
          <br />
          Si no lo haces, tu sesión será cerrada automáticamente.
        </p>

        {/* ✔️ Ya verifiqué */}
        <button
          className="bg-[#b03a1a] text-white rounded px-4 py-2 font-bold mt-2 hover:bg-yellow-500 disabled:opacity-60"
          onClick={handleCheckVerified}
          disabled={loading}
        >
          Ya verifiqué mi correo
        </button>

        {/* 🔁 Reenviar */}
        <button
          className="block mx-auto mt-3 text-blue-700 underline text-sm disabled:opacity-60"
          disabled={loading}
          onClick={handleResend}
        >
          {loading ? "Enviando…" : "Reenviar correo de verificación"}
        </button>

        {/* Mensaje */}
        {msg && (
          <div className="mt-3 text-green-700 text-xs">
            {msg}
          </div>
        )}

        {/* ❌ Cerrar sesión */}
        <button
          onClick={cerrarSesion}
          className="absolute right-3 top-2 text-[#b03a1a] text-lg hover:text-red-700 font-bold"
          title="Cerrar sesión"
        >
          ×
        </button>
      </div>
    </div>
  );
}
