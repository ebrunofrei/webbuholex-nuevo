// ============================================================================
// 🔐 AuthContext — Autenticación (Firebase Auth | Hardened)
// ----------------------------------------------------------------------------
// - Ciclo de vida seguro
// - Ningún useEffect async
// - Ningún cleanup inválido
// - API estable para el resto de la app
// ============================================================================

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";

import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  onAuthStateChanged,
  sendEmailVerification,
  updateProfile,
} from "firebase/auth";

import { auth } from "@/firebase";

// ============================================================================
// CONTEXT
// ============================================================================

const AuthContext = createContext(null);

// ============================================================================
// HOOK
// ============================================================================

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth debe usarse dentro de <AuthProvider>");
  }
  return ctx;
}

// ============================================================================
// PROVIDER
// ============================================================================

export function AuthProvider({ children }) {
  // --------------------------------------------------------------------------
  // STATE
  // --------------------------------------------------------------------------

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const [isPremium, setIsPremium] = useState(false);
  const [emailVerificado, setEmailVerificado] = useState(false);

  const [modalLoginOpen, setModalLoginOpen] = useState(false);
  const [modalLoginTab, setModalLoginTab] = useState("login");

  const [toast, setToast] = useState({
    show: false,
    message: "",
    type: "info",
  });

  // --------------------------------------------------------------------------
  // AUTH LISTENER (CRÍTICO – HARDENED)
  // --------------------------------------------------------------------------
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser || null);

      setEmailVerificado(
        Boolean(firebaseUser?.emailVerified || firebaseUser?.isAnonymous)
      );

      // ⚠️ Premium se decide fuera (Mongo / backend)
      setIsPremium(false);

      setLoading(false);
    });

    // 🔒 Cleanup 100% válido
    return () => {
      if (typeof unsubscribe === "function") {
        unsubscribe();
      }
    };
  }, []);

  // --------------------------------------------------------------------------
  // MODAL CONTROL
  // --------------------------------------------------------------------------

  const abrirModalLogin = useCallback((tab = "login") => {
    setModalLoginTab(tab);
    setModalLoginOpen(true);
  }, []);

  const cerrarModalLogin = useCallback(() => {
    setModalLoginOpen(false);
  }, []);

  // --------------------------------------------------------------------------
  // AUTH ACTIONS
  // --------------------------------------------------------------------------

  const login = useCallback(async (email, password) => {
    await signInWithEmailAndPassword(auth, email, password);

    setToast({
      show: true,
      message: "¡Bienvenido!",
      type: "success",
    });

    cerrarModalLogin();
  }, [cerrarModalLogin]);

  const register = useCallback(
    async (email, password, name = "") => {
      const res = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );

      if (name) {
        await updateProfile(res.user, { displayName: name });
      }

      await sendEmailVerification(res.user);

      setToast({
        show: true,
        message: "¡Registro exitoso! Revisa tu correo.",
        type: "success",
      });

      cerrarModalLogin();
    },
    [cerrarModalLogin]
  );

  const resetPassword = useCallback(async (email) => {
    await sendPasswordResetEmail(auth, email);

    setToast({
      show: true,
      message: "Correo de recuperación enviado.",
      type: "success",
    });

    cerrarModalLogin();
  }, [cerrarModalLogin]);

  const cerrarSesion = useCallback(async () => {
    await signOut(auth);

    setToast({
      show: true,
      message: "Sesión cerrada.",
      type: "info",
    });
  }, []);

  // --------------------------------------------------------------------------
  // 🔁 REFRESCAR USUARIO (EMAIL VERIFICADO / RELOAD SEGURO)
  // --------------------------------------------------------------------------

  const refrescarUsuario = useCallback(async () => {
    const current = auth.currentUser;
    if (!current) return;

    await current.reload();

    setUser({ ...current });
    setEmailVerificado(
      Boolean(current.emailVerified || current.isAnonymous)
    );
  }, []);

  // --------------------------------------------------------------------------
  // CONTEXT VALUE (MEMOIZADO)
  // --------------------------------------------------------------------------

  const value = useMemo(
    () => ({
      // estado
      user,
      loading,
      isPremium,
      emailVerificado,

      // auth actions
      login,
      register,
      resetPassword,
      cerrarSesion,
      refrescarUsuario,

      // ui
      modalLoginOpen,
      modalLoginTab,
      abrirModalLogin,
      cerrarModalLogin,

      // feedback
      toast,
      setToast,
    }),
    [
      user,
      loading,
      isPremium,
      emailVerificado,
      login,
      register,
      resetPassword,
      cerrarSesion,
      refrescarUsuario,
      modalLoginOpen,
      modalLoginTab,
      abrirModalLogin,
      cerrarModalLogin,
      toast,
    ]
  );

  // --------------------------------------------------------------------------
  // RENDER
  // --------------------------------------------------------------------------

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
