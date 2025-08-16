import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import { FaUser, FaEnvelope, FaLock, FaGoogle } from "react-icons/fa";

const COLOR = "#b03a1a";
export default function ModalLogin() {
  const { modalLoginOpen, modalLoginTab, setModalLoginTab, cerrarModalLogin } = useAuth();

  // ESC para cerrar
  useEffect(() => {
    function handleEsc(e) {
      if (e.key === "Escape") cerrarModalLogin();
    }
    if (modalLoginOpen) window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [modalLoginOpen]);

  if (!modalLoginOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={cerrarModalLogin}
        aria-modal="true"
      >
        <motion.div
          className="w-full md:max-w-md bg-white rounded-t-3xl md:rounded-2xl shadow-2xl px-6 py-8 md:py-10 relative min-h-[40vh] max-h-[90vh] overflow-auto border-2"
          style={{ borderColor: COLOR }}
          initial={{ y: 100, scale: 1, opacity: 0 }}
          animate={{ y: 0, scale: 1, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: "spring", bounce: 0.23, duration: 0.38 }}
          onClick={e => e.stopPropagation()}
        >
          {/* Cerrar */}
          <button
            className="absolute top-3 right-4 text-3xl text-gray-400 hover:text-[#b03a1a] font-extrabold focus:outline-none"
            onClick={cerrarModalLogin}
            aria-label="Cerrar"
            tabIndex={0}
          >×</button>

          {/* Tabs */}
          <div className="flex justify-center gap-2 mb-8">
            <TabBtn act={modalLoginTab === "login"} onClick={() => setModalLoginTab("login")}>Iniciar sesión</TabBtn>
            <TabBtn act={modalLoginTab === "register"} onClick={() => setModalLoginTab("register")}>Registrarse</TabBtn>
          </div>

          {/* Formulario */}
          <div className="px-2">
            {modalLoginTab === "login" && <LoginForm setModalLoginTab={setModalLoginTab} />}
            {modalLoginTab === "register" && <RegisterForm />}
            {modalLoginTab === "recuperar" && <ResetPasswordForm setModalLoginTab={setModalLoginTab} />}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function TabBtn({ act, children, ...props }) {
  return (
    <button
      className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all border
        ${act
          ? "bg-[#b03a1a] text-white border-[#b03a1a] shadow-md"
          : "bg-gray-100 text-[#a52e00] border-transparent hover:bg-[#fff7e6]"
        }`}
      {...props}
    >{children}</button>
  );
}

// LOGIN
function LoginForm({ setModalLoginTab }) {
  const { login, loginGoogle } = useAuth();
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await login(form.email, form.password);
    } catch (err) {
      setError("Correo o contraseña incorrectos.");
    }
    setLoading(false);
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      {error && <div className="bg-red-50 text-red-700 rounded p-2">{error}</div>}
      <Input icon={<FaEnvelope />} placeholder="Correo electrónico" type="email" autoComplete="username"
        value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
      <Input icon={<FaLock />} placeholder="Contraseña" type="password" autoComplete="current-password"
        value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
      <button disabled={loading} type="submit" className="w-full bg-[#b03a1a] text-white py-2 rounded-lg font-bold hover:bg-[#a52e00] transition-all shadow">
        {loading ? "Ingresando..." : "Ingresar"}
      </button>
      <div className="text-center text-gray-400 my-2">o</div>
      <button
        type="button"
        onClick={loginGoogle}
        className="w-full bg-white text-[#b03a1a] border border-[#b03a1a] py-2 rounded-lg font-semibold flex items-center justify-center gap-2 hover:bg-[#fff7e6] transition"
      >
        <FaGoogle /> Ingresar con Google
      </button>
      <div className="flex justify-end mt-2">
        <button
          type="button"
          className="text-xs underline text-[#b03a1a]"
          onClick={() => setModalLoginTab('recuperar')}
        >
          ¿Olvidaste tu contraseña?
        </button>
      </div>
    </form>
  );
}

// REGISTER
function RegisterForm() {
  const { register } = useAuth();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await register(form.email, form.password, form.name);
    } catch (err) {
      setError("No se pudo registrar: " + (err.message || "Intenta de nuevo."));
    }
    setLoading(false);
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      {error && <div className="bg-red-50 text-red-700 rounded p-2">{error}</div>}
      <Input icon={<FaUser />} placeholder="Nombre completo" value={form.name}
        onChange={e => setForm({ ...form, name: e.target.value })} />
      <Input icon={<FaEnvelope />} placeholder="Correo electrónico" type="email"
        value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
      <Input icon={<FaLock />} placeholder="Contraseña" type="password"
        value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
      <button disabled={loading} type="submit" className="w-full bg-[#b03a1a] text-white py-2 rounded-lg font-bold hover:bg-[#a52e00] transition-all shadow">
        {loading ? "Registrando..." : "Registrarse"}
      </button>
    </form>
  );
}

// RESET PASSWORD
function ResetPasswordForm({ setModalLoginTab }) {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await resetPassword(email);
      setSent(true);
    } catch (err) {
      setError("No se pudo enviar el correo. ¿Está bien escrito?");
    }
    setLoading(false);
  }

  return sent ? (
    <div className="text-green-700 bg-green-50 rounded p-4 text-center">
      ✔️ Revisa tu correo y sigue las instrucciones para recuperar tu contraseña.
      <button
        className="block mt-4 mx-auto text-xs underline text-[#b03a1a]"
        onClick={() => setModalLoginTab("login")}
      >
        Volver al inicio de sesión
      </button>
    </div>
  ) : (
    <form className="space-y-5" onSubmit={handleSubmit}>
      {error && <div className="bg-red-50 text-red-700 rounded p-2">{error}</div>}
      <Input icon={<FaEnvelope />} placeholder="Correo electrónico" type="email"
        value={email} onChange={e => setEmail(e.target.value)} />
      <button disabled={loading} type="submit" className="w-full bg-[#b03a1a] text-white py-2 rounded-lg font-bold hover:bg-[#a52e00] transition-all shadow">
        {loading ? "Enviando..." : "Enviar correo de recuperación"}
      </button>
      <button
        type="button"
        className="block mx-auto text-xs underline text-[#b03a1a]"
        onClick={() => setModalLoginTab("login")}
      >
        Volver al inicio de sesión
      </button>
    </form>
  );
}

// INPUT estilizado
function Input({ icon, ...props }) {
  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#b03a1a] opacity-90">{icon}</span>
      <input
        className="w-full border pl-10 pr-4 py-2 rounded-lg focus:ring-2 focus:ring-[#b03a1a] border-gray-200 transition placeholder-gray-400 text-sm"
        {...props}
      />
    </div>
  );
}
