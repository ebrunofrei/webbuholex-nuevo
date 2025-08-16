import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { updateEmail, updatePassword } from "firebase/auth";
import Toast from "../components/ui/Toast";
import buholexLogo from "../assets/buho-institucional.png";

export default function MiCuenta() {
  const { user, isPremium, reloadUsuario } = useAuth();
  const [email, setEmail] = useState(user?.email || "");
  const [password, setPassword] = useState("");
  const [toast, setToast] = useState({ show: false, type: "success", message: "" });
  const [loadingEmail, setLoadingEmail] = useState(false);
  const [loadingPassword, setLoadingPassword] = useState(false);
  const [loadingUpgrade, setLoadingUpgrade] = useState(false);

  // Actualizar email
  const handleEmailChange = async (e) => {
    e.preventDefault();
    setLoadingEmail(true);
    try {
      await updateEmail(user, email);
      setToast({ show: true, type: "success", message: "¡Correo actualizado correctamente!" });
    } catch (err) {
      let msg = err.code === "auth/requires-recent-login"
        ? "Por seguridad, debes cerrar sesión y volver a ingresar para cambiar el correo."
        : "Error al actualizar correo: " + (err.message || "");
      setToast({ show: true, type: "error", message: msg });
    }
    setLoadingEmail(false);
  };

  // Actualizar contraseña
  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setLoadingPassword(true);
    try {
      await updatePassword(user, password);
      setToast({ show: true, type: "success", message: "¡Contraseña actualizada correctamente!" });
      setPassword("");
    } catch (err) {
      let msg = err.code === "auth/requires-recent-login"
        ? "Debes volver a iniciar sesión para cambiar la contraseña."
        : "Error al actualizar contraseña: " + (err.message || "");
      setToast({ show: true, type: "error", message: msg });
    }
    setLoadingPassword(false);
  };

  // Callback después de pago Stripe exitoso (puedes mejorar con webhook o reload automático)
  const handlePagoExitoso = async () => {
    setToast({ show: true, type: "success", message: "¡Felicitaciones! Ahora eres user Premium." });
    await reloadUsuario?.();
  };

  return (
    <div className="max-w-lg mx-auto mt-10 bg-white rounded-2xl shadow-lg p-8">
      {/* DASHBOARD HEADER */}
      <div className="flex flex-col items-center mb-6">
        <img
          src={user?.photoURL || buholexLogo}
          alt="Avatar"
          className="w-20 h-20 rounded-full border-4 border-[#b03a1a] mb-2 bg-white object-cover"
        />
        <div className="font-bold text-2xl text-[#4b2e19]">{user?.displayName || "Usuario anónimo"}</div>
        <div className="text-[#b03a1a] font-semibold">{user?.email || "Sin email"}</div>
        <div className={`font-bold mt-2 px-5 py-1 rounded-xl text-sm 
          ${isPremium ? "bg-[#e9dcc3] text-[#4b2e19]" : "bg-[#fde7e7] text-[#b03a1a]"}`}>
          {isPremium ? "USUARIO PREMIUM" : "PLAN GRATIS"}
        </div>
        {/* BOTÓN STRIPE */}
        {!isPremium && (
          <div className="mt-3">
            <PagoStripeButton usuarioId={user?.uid} onSuccess={handlePagoExitoso} />
          </div>
        )}
      </div>

      <h2 className="text-2xl font-bold text-[#b03a1a] mb-5">Mi Cuenta</h2>

      {/* Formulario para cambiar correo */}
      <form onSubmit={handleEmailChange} className="mb-8">
        <label className="block mb-1 font-medium text-[#b03a1a]">Correo electrónico</label>
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
          className="w-full border px-3 py-2 rounded"
        />
        <button
          type="submit"
          className="bg-[#b03a1a] text-white rounded-xl py-2 font-bold mt-2 transition hover:bg-[#a52e00] w-full"
          disabled={loadingEmail}
        >
          {loadingEmail ? "Actualizando..." : "Actualizar correo"}
        </button>
      </form>

      {/* Formulario para cambiar contraseña */}
      <form onSubmit={handlePasswordChange}>
        <label className="block mb-1 font-medium text-[#b03a1a]">Nueva contraseña</label>
        <input
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          minLength={6}
          placeholder="Mínimo 6 caracteres"
          required
          className="w-full border px-3 py-2 rounded"
        />
        <button
          type="submit"
          className="bg-[#b03a1a] text-white rounded-xl py-2 font-bold mt-2 transition hover:bg-[#a52e00] w-full"
          disabled={loadingPassword || !password}
        >
          {loadingPassword ? "Actualizando..." : "Actualizar contraseña"}
        </button>
      </form>

      {/* Accesos rápidos y gestión */}
      <div className="mt-8 mb-2">
        <h3 className="text-[#b03a1a] font-bold text-lg mb-2">Gestión y beneficios</h3>
        <ul className="list-disc pl-6 space-y-1 text-[#4b2e19]">
          <li>
            <a href="/historial-chat" className="text-[#b03a1a] underline font-semibold">Historial de chats</a>
          </li>
          <li>
            <a href="/favoritos" className="text-[#b03a1a] underline font-semibold">Favoritos</a>
          </li>
          <li>
            <a href="/historial-archivos" className="text-[#b03a1a] underline font-semibold">Archivos analizados</a>
          </li>
          <li>
            <a href="/mi-perfil" className="text-[#b03a1a] underline font-semibold">Editar perfil y contraseña</a>
          </li>
          <li>
            <a href="/planes-premium" className="text-[#b03a1a] underline font-semibold">Ver/renovar mi plan Premium</a>
          </li>
        </ul>
      </div>

      {/* Toast feedback */}
      <Toast
        open={toast.show}
        type={toast.type}
        message={toast.message}
        onClose={() => setToast({ ...toast, show: false })}
      />
    </div>
  );
}
