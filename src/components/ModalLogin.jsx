// src/components/ModalLogin.jsx
import React, { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import logoBuho from "@/assets/buho-institucional.png";

export default function ModalLogin() {
  const {
    modalLoginOpen,
    modalLoginTab,
    abrirModalLogin,
    cerrarModalLogin,
    login,
    register,
    resetPassword,
  } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [resetEmail, setResetEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  if (!modalLoginOpen) return null;

  const activeTab = modalLoginTab || "login";

  const handleLogin = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg("");

    try {
      await login(email, password); // AuthContext cierra el modal en éxito
    } catch (err) {
      console.error(err);
      setErrorMsg(
        "No pudimos iniciar sesión. Revisa tu correo/usuario y contraseña."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg("");

    try {
      await register(email, password, name);
    } catch (err) {
      console.error(err);
      setErrorMsg(
        "No pudimos completar el registro. Verifica los datos o intenta más tarde."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg("");

    try {
      await resetPassword(resetEmail);
    } catch (err) {
      console.error(err);
      setErrorMsg(
        "No pudimos enviar el correo de recuperación. Verifica el correo ingresado."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const goLogin = () => {
    setErrorMsg("");
    setPassword("");
    abrirModalLogin("login");
  };

  const goRegister = () => {
    setErrorMsg("");
    setPassword("");
    abrirModalLogin("registro");
  };

  const goRecover = () => {
    setErrorMsg("");
    setPassword("");
    setResetEmail(email || "");
    abrirModalLogin("recuperar");
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 px-4">
      {/* CARD */}
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl border border-[#f3d7c2] relative">
        {/* Close button */}
        <button
          onClick={cerrarModalLogin}
          className="absolute right-3 top-3 text-gray-400 hover:text-gray-600 text-lg"
          aria-label="Cerrar"
        >
          ✕
        </button>

        {/* Header */}
        <div className="flex flex-col items-center pt-6 pb-4 px-6">
          <img
            src={logoBuho}
            alt="BúhoLex"
            className="w-16 h-16 rounded-full border-4 border-[#b03a1a] bg-white shadow-md mb-2"
          />
          <h2 className="text-xl font-extrabold text-[#4b2e19] text-center">
            Acceso a Oficina Virtual
          </h2>
          <p className="text-xs text-gray-600 text-center mt-1">
            Inicia sesión o crea tu cuenta para usar la Oficina Virtual y el
            LitisBot Pro.
          </p>
        </div>

        {/* Tabs (solo para login/registro) */}
        {activeTab !== "recuperar" && (
          <div className="px-6 pb-1">
            <div className="flex text-sm rounded-full bg-[#f9ede4] p-1">
              <button
                type="button"
                onClick={goLogin}
                className={
                  "flex-1 rounded-full px-3 py-2 font-semibold transition " +
                  (activeTab === "login"
                    ? "bg-[#b03a1a] text-white shadow"
                    : "text-[#b03a1a]")
                }
              >
                Iniciar sesión
              </button>
              <button
                type="button"
                onClick={goRegister}
                className={
                  "flex-1 rounded-full px-3 py-2 font-semibold transition " +
                  (activeTab === "registro"
                    ? "bg-[#b03a1a] text-white shadow"
                    : "text-[#b03a1a]")
                }
              >
                Registrarse
              </button>
            </div>
          </div>
        )}

        {/* Error message */}
        {errorMsg && (
          <div className="px-6 pt-2">
            <div className="rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 px-3 py-2">
              {errorMsg}
            </div>
          </div>
        )}

        {/* Body */}
        <div className="px-6 pb-6 pt-3">
          {/* LOGIN */}
          {activeTab === "login" && (
            <form onSubmit={handleLogin} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[#4b2e19] mb-1">
                  Correo o usuario
                </label>
                <input
                  type="email"
                  className="w-full rounded-lg border border-[#e2c6b3] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#b03a1a]/70"
                  placeholder="tucorreo@ejemplo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="username"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#4b2e19] mb-1">
                  Contraseña
                </label>
                <input
                  type="password"
                  className="w-full rounded-lg border border-[#e2c6b3] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#b03a1a]/70"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  autoComplete="current-password"
                />
              </div>

              <div className="flex items-center justify-between text-xs mt-1">
                <button
                  type="button"
                  onClick={goRecover}
                  className="text-[#b03a1a] hover:underline font-semibold"
                >
                  Olvidé mi contraseña
                </button>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="mt-1 w-full rounded-xl bg-[#b03a1a] py-2.5 text-sm font-bold text-white shadow hover:bg-[#962a15] disabled:opacity-60"
              >
                {submitting ? "Ingresando..." : "Ingresar a mi oficina"}
              </button>

              <p className="mt-2 text-[11px] text-gray-500 text-center">
                Al continuar aceptas los{" "}
                <a
                  href="/legal/terminos-y-condiciones"
                  className="text-[#b03a1a] underline"
                >
                  Términos y Condiciones
                </a>{" "}
                y la{" "}
                <a
                  href="/legal/politica-de-privacidad"
                  className="text-[#b03a1a] underline"
                >
                  Política de Privacidad
                </a>
                .
              </p>
            </form>
          )}

          {/* REGISTRO */}
          {activeTab === "registro" && (
            <form onSubmit={handleRegister} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[#4b2e19] mb-1">
                  Nombre completo
                </label>
                <input
                  type="text"
                  className="w-full rounded-lg border border-[#e2c6b3] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#b03a1a]/70"
                  placeholder="Ej. Dra. María Pérez"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#4b2e19] mb-1">
                  Correo electrónico
                </label>
                <input
                  type="email"
                  className="w-full rounded-lg border border-[#e2c6b3] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#b03a1a]/70"
                  placeholder="tucorreo@ejemplo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#4b2e19] mb-1">
                  Contraseña
                </label>
                <input
                  type="password"
                  className="w-full rounded-lg border border-[#e2c6b3] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#b03a1a]/70"
                  placeholder="Mínimo 6 caracteres"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  autoComplete="new-password"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="mt-1 w-full rounded-xl bg-[#b03a1a] py-2.5 text-sm font-bold text-white shadow hover:bg-[#962a15] disabled:opacity-60"
              >
                {submitting ? "Creando cuenta..." : "Crear cuenta y acceder"}
              </button>

              <p className="mt-2 text-[11px] text-gray-500 text-center">
                ¿Ya tienes cuenta?{" "}
                <button
                  type="button"
                  onClick={goLogin}
                  className="text-[#b03a1a] underline font-semibold"
                >
                  Inicia sesión
                </button>
              </p>
            </form>
          )}

          {/* RECUPERAR CONTRASEÑA */}
          {activeTab === "recuperar" && (
            <form onSubmit={handleReset} className="space-y-3">
              <h3 className="text-sm font-bold text-[#4b2e19] mb-1">
                Recuperar contraseña
              </h3>
              <p className="text-xs text-gray-600 mb-1">
                Te enviaremos un enlace de recuperación al correo registrado.
              </p>

              <div>
                <label className="block text-xs font-semibold text-[#4b2e19] mb-1">
                  Correo electrónico registrado
                </label>
                <input
                  type="email"
                  className="w-full rounded-lg border border-[#e2c6b3] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#b03a1a]/70"
                  placeholder="tucorreo@ejemplo.com"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  required
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="mt-1 w-full rounded-xl bg-[#b03a1a] py-2.5 text-sm font-bold text-white shadow hover:bg-[#962a15] disabled:opacity-60"
              >
                {submitting ? "Enviando correo..." : "Enviar enlace de recuperación"}
              </button>

              <button
                type="button"
                onClick={goLogin}
                className="mt-2 w-full text-xs text-[#b03a1a] underline font-semibold text-center"
              >
                ← Volver a iniciar sesión
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
