import React, { useState } from "react";
import { sendPasswordResetEmail, getAuth } from "firebase/auth";
import { app } from "../services/firebaseConfig";

export default function ModalRecuperarPassword({ abierto, onClose }) {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  if (!abierto) return null;

  const handleReset = async (e) => {
    e.preventDefault();
    setMsg("");
    setLoading(true);
    try {
      await sendPasswordResetEmail(getAuth(app), email);
      setMsg("Revisa tu correo para recuperar tu contraseña.");
    } catch (err) {
      setMsg("Error: " + (err?.message || "No se pudo enviar el correo."));
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-8 w-full max-w-sm shadow-xl relative">
        <button className="absolute top-2 right-3 text-xl" onClick={onClose}>✕</button>
        <h2 className="font-bold text-lg mb-3">Recuperar Contraseña</h2>
        <form onSubmit={handleReset}>
          <input
            type="email"
            className="border p-2 rounded w-full mb-3"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="Tu correo registrado"
            required
          />
          <button
            type="submit"
            className="bg-blue-600 text-white px-4 py-2 rounded w-full"
            disabled={loading}
          >
            {loading ? "Enviando..." : "Enviar enlace"}
          </button>
        </form>
        <div className="mt-3 text-center text-sm">{msg}</div>
      </div>
    </div>
  );
}
