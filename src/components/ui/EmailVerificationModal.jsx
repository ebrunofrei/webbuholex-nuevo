import React, { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { sendEmailVerification } from "firebase/auth";

export default function EmailVerificationModal({ open }) {
  const { user, refrescarUsuario, cerrarSesion } = useAuth();
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const handleResend = async () => {
    setLoading(true); setMsg("");
    try {
      await sendEmailVerification(user);
      setMsg("Correo reenviado. Revisa tu inbox y spam.");
    } catch (err) {
      setMsg("Error: " + err.message);
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-[200] bg-black/40 flex items-center justify-center">
      <div className="bg-white max-w-sm w-full p-6 rounded-xl shadow-xl border-2 border-yellow-400 text-center relative">
        <h2 className="text-2xl font-bold text-[#b03a1a] mb-2">Verifica tu correo</h2>
        <p className="mb-2">Enviamos un enlace de verificación a:<br /><b>{user?.email}</b></p>
        <p className="text-yellow-700 text-sm mb-4">
          Debes verificar tu correo electrónico en los próximos <b>15 minutos</b> para continuar.<br />
          Si no lo haces, tu sesión será cerrada automáticamente.
        </p>
        <button
          className="bg-[#b03a1a] text-white rounded px-4 py-2 font-bold mt-2 hover:bg-yellow-500"
          onClick={async () => {
            await user.reload();
            refrescarUsuario();
          }}
        >
          Ya verifiqué mi correo
        </button>
        <button
          className="block mx-auto mt-3 text-blue-700 underline text-sm"
          disabled={loading}
          onClick={handleResend}
        >
          {loading ? "Enviando..." : "Reenviar correo de verificación"}
        </button>
        {msg && <div className="mt-2 text-green-700 text-xs">{msg}</div>}
        <button
          onClick={cerrarSesion}
          className="absolute right-3 top-2 text-[#b03a1a] text-lg hover:text-red-700 font-bold"
          title="Cerrar sesión"
        >×</button>
      </div>
    </div>
  );
}
