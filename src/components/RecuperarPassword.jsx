import React, { useRef, useState } from "react";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "../services/firebaseConfig";

export default function RecuperarPassword() {
  const emailRef = useRef();
  const [enviado, setEnviado] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setEnviado(false);
    setError("");
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, emailRef.current.value);
      setEnviado(true);
    } catch (err) {
      setError("No se pudo enviar el correo. Verifica que el email esté registrado.");
    }
    setLoading(false);
  };

  return (
    <div className="max-w-sm mx-auto mt-16 p-6 bg-white rounded-xl shadow-lg">
      <h2 className="text-xl font-bold mb-3 text-black">Recuperar contraseña</h2>
      <form onSubmit={handleSubmit}>
        <input
          ref={emailRef}
          type="email"
          className="w-full mb-2 border rounded px-2 py-1"
          placeholder="Correo electrónico"
          required
        />
        <button
          className="w-full bg-[#a52e00] hover:bg-[#d9480f] text-white py-2 rounded"
          disabled={loading}
        >
          {loading ? "Enviando..." : "Enviar enlace de recuperación"}
        </button>
      </form>
      {enviado && (
        <div className="text-green-700 mt-3">
          Se envió un enlace de recuperación a tu correo electrónico. Revisa tu bandeja de entrada y spam.
        </div>
      )}
      {error && (
        <div className="text-red-600 mt-3">{error}</div>
      )}
      <div className="mt-2 text-sm">
        <a href="/login" className="text-blue-700 underline">Volver al login</a>
      </div>
    </div>
  );
}
