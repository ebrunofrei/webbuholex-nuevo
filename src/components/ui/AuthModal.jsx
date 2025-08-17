import React, { useState } from "react";
import { useAuth } from "../../context/AuthContext";

export default function AuthModal({ open, onClose }) {
  const { login, register, resetPassword, setToast } = useAuth();
  const [tab, setTab] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!open) return null;

  // --- HANDLERS ---
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await login(email, password);
      setToast({ show: true, message: "¡Bienvenido!", type: "success" });
      onClose(); // Cierra modal tras login exitoso
    } catch (err) {
      setError(err.message || "Error de acceso.");
      setToast({ show: true, message: err.message, type: "error" });
    }
    setLoading(false);
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await register(email, password, name);
      setToast({ show: true, message: "¡Registro exitoso! Revisa tu correo.", type: "success" });
      onClose(); // Cierra modal tras registro exitoso
    } catch (err) {
      setError(err.message || "No se pudo registrar.");
      setToast({ show: true, message: err.message, type: "error" });
    }
    setLoading(false);
  };

  const handleReset = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await resetPassword(email);
      setToast({ show: true, message: "Enlace de recuperación enviado.", type: "success" });
      setTab("login");
      onClose(); // Cierra modal tras recuperación
    } catch (err) {
      setError(err.message || "No se pudo enviar el enlace.");
      setToast({ show: true, message: err.message, type: "error" });
    }
    setLoading(false);
  };

  // --- RENDER ---
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm mx-4 p-8 relative animate-fadeIn max-h-[90vh] overflow-y-auto">
        {/* Botón cerrar */}
        <button
          className="absolute top-2 right-3 text-gray-500 hover:text-red-600 text-xl"
          onClick={onClose}
          aria-label="Cerrar modal"
        >
          ×
        </button>
        {/* Tabs */}
        <div className="flex justify-center mb-6 gap-4">
          <button
            className={`px-2 py-1 ${tab === "login" ? "font-bold underline" : ""}`}
            onClick={() => setTab("login")}
            type="button"
          >
            Iniciar sesión
          </button>
          <button
            className={`px-2 py-1 ${tab === "register" ? "font-bold underline" : ""}`}
            onClick={() => setTab("register")}
            type="button"
          >
            Registrarse
          </button>
          <button
            className={`px-2 py-1 text-xs ${tab === "reset" ? "font-bold underline" : ""}`}
            onClick={() => setTab("reset")}
            type="button"
          >
            ¿Olvidaste tu contraseña?
          </button>
        </div>

        {/* Feedback de error */}
        {error && (
          <div className="bg-red-100 text-red-700 rounded p-2 mb-3 text-sm">{error}</div>
        )}

        {/* LOGIN */}
        {tab === "login" && (
          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <input
              type="email"
              placeholder="Correo electrónico"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="border rounded py-2 px-3"
              required
            />
            <input
              type="password"
              placeholder="Contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="border rounded py-2 px-3"
              required
            />
            <button
              type="submit"
              disabled={loading}
              className="bg-[#a52e00] hover:bg-[#a52e00]/90 text-white py-2 rounded font-bold transition"
            >
              {loading ? "Ingresando..." : "Ingresar"}
            </button>
          </form>
        )}

        {/* REGISTRO */}
        {tab === "register" && (
          <form onSubmit={handleRegister} className="flex flex-col gap-4">
            <input
              type="text"
              placeholder="Nombre completo"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="border rounded py-2 px-3"
              required
            />
            <input
              type="email"
              placeholder="Correo electrónico"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="border rounded py-2 px-3"
              required
            />
            <input
              type="password"
              placeholder="Contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="border rounded py-2 px-3"
              required
            />
            <button
              type="submit"
              disabled={loading}
              className="bg-[#a52e00] hover:bg-[#a52e00]/90 text-white py-2 rounded font-bold transition"
            >
              {loading ? "Registrando..." : "Registrarme"}
            </button>
          </form>
        )}

        {/* RECUPERAR PASSWORD */}
        {tab === "reset" && (
          <form onSubmit={handleReset} className="flex flex-col gap-4">
            <input
              type="email"
              placeholder="Correo electrónico"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="border rounded py-2 px-3"
              required
            />
            <button
              type="submit"
              disabled={loading}
              className="bg-[#a52e00] hover:bg-[#a52e00]/90 text-white py-2 rounded font-bold transition"
            >
              {loading ? "Enviando..." : "Enviar enlace"}
            </button>
            <button
              type="button"
              className="text-xs underline text-[#a52e00] mt-2"
              onClick={() => setTab("login")}
            >
              Volver al inicio de sesión
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
