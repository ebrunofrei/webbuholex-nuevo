import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  onAuthStateChanged,
  sendEmailVerification,
  updateProfile,
} from "firebase/auth";
import { app } from "../services/firebaseConfig";

// --- CONTEXTO ---
const AuthContext = createContext();

// HOOK: para usar el contexto de auth en cualquier parte de la app
export function useAuth() {
  return useContext(AuthContext);
}

// PROVIDER
export function AuthProvider({ children }) {
  const auth = getAuth(app);

  // Estados principales
  const [user, setUsuario] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isPremium, setIsPremium] = useState(false);
  const [emailVerificado, setEmailVerificado] = useState(false);

  // Control modal login
  const [modalLoginOpen, setModalLoginOpen] = useState(false);
  const [modalLoginTab, setModalLoginTab] = useState("login");

  // Toast global (opcional, para feedbacks visuales)
  const [toast, setToast] = useState({ show: false, message: "", type: "info" });

  // --- Funciones de modal ---
  const abrirModalLogin = (tab = "login") => {
    setModalLoginTab(tab);
    setModalLoginOpen(true);
  };
  const cerrarModalLogin = () => setModalLoginOpen(false);

  // --- Funciones de auth ---
  const login = async (email, password) => {
    await signInWithEmailAndPassword(auth, email, password);
    setToast({ show: true, message: "¡Bienvenido!", type: "success" });
    cerrarModalLogin();
  };

  const register = async (email, password, name = "") => {
    const res = await createUserWithEmailAndPassword(auth, email, password);
    if (name) await updateProfile(res.user, { displayName: name });
    await sendEmailVerification(res.user);
    setToast({ show: true, message: "¡Registro exitoso! Revisa tu correo.", type: "success" });
    cerrarModalLogin();
  };

  const resetPassword = async (email) => {
    await sendPasswordResetEmail(auth, email);
    setToast({ show: true, message: "Correo de recuperación enviado.", type: "success" });
    cerrarModalLogin();
  };

  const cerrarSesion = async () => {
    await signOut(auth);
    setToast({ show: true, message: "Sesión cerrada.", type: "info" });
  };

  // --- Listener user ---
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setUsuario(user);
      setLoading(false);
      console.log("onAuthStateChanged:", user);

      if (user) {
        setEmailVerificado(user.emailVerified || user.isAnonymous);
        setIsPremium(false); // Puedes cambiar la lógica premium aquí
      } else {
        setUsuario(null);
        setEmailVerificado(false);
        setIsPremium(false);
      }
    });
    return () => unsub();
    // eslint-disable-next-line
  }, []);

  // --- Re-verificar user (útil tras registro/verificación) ---
  const refrescarUsuario = useCallback(async () => {
    if (auth.currentUser) {
      await auth.currentUser.reload();
      setUsuario({ ...auth.currentUser });
      setEmailVerificado(auth.currentUser.emailVerified || auth.currentUser.isAnonymous);
    }
  }, [auth]);

  // --- Proveer contexto ---
  const value = {
    user,
    loading,
    isPremium,
    emailVerificado,
    login,
    register,
    resetPassword,
    cerrarSesion,
    abrirModalLogin,
    cerrarModalLogin,
    refrescarUsuario,
    modalLoginOpen,
    modalLoginTab,
    setToast,
    toast,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
