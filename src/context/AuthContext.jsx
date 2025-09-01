// src/context/AuthContext.jsx
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
import { auth } from "@/firebase";

const AuthContext = createContext();

// Hook
export function useAuth() {
  return useContext(AuthContext);
}

// Provider
export function AuthProvider({ children }) {
  const [user, setUsuario] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isPremium, setIsPremium] = useState(false);
  const [emailVerificado, setEmailVerificado] = useState(false);
  const [modalLoginOpen, setModalLoginOpen] = useState(false);
  const [modalLoginTab, setModalLoginTab] = useState("login");
  const [toast, setToast] = useState({ show: false, message: "", type: "info" });

  const abrirModalLogin = (tab = "login") => {
    setModalLoginTab(tab);
    setModalLoginOpen(true);
  };
  const cerrarModalLogin = () => setModalLoginOpen(false);

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

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUsuario(u);
      setLoading(false);
      setEmailVerificado(u?.emailVerified || u?.isAnonymous || false);
      setIsPremium(false);
    });
    return () => unsub();
  }, []);

  const refrescarUsuario = useCallback(async () => {
    if (auth.currentUser) {
      await auth.currentUser.reload();
      setUsuario({ ...auth.currentUser });
      setEmailVerificado(auth.currentUser.emailVerified || auth.currentUser.isAnonymous);
    }
  }, []);

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

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
