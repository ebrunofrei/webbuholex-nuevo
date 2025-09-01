// src/context/GoogleAuthContext.jsx
import React, { createContext, useContext, useState } from "react";
import { GoogleOAuthProvider, googleLogout, useGoogleLogin } from "@react-oauth/google";

// --- CONTEXTO ---
const GoogleAuthContext = createContext();

// --- PROVIDER PRINCIPAL ---
export function GoogleAuthProvider({ children }) {
  const [token, setToken] = useState(null);
  const [profile, setProfile] = useState(null);

  // --- LOGIN ---
  const login = useGoogleLogin({
    scope: "https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/userinfo.profile",
    onSuccess: async (tokenResponse) => {
      const accessToken = tokenResponse.access_token;
      setToken(accessToken);

      try {
        const resp = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        const data = await resp.json();
        setProfile(data);
      } catch (error) {
        console.error("Error al obtener perfil de Google:", error);
      }
    },
    onError: () => alert("No se pudo conectar con Google Calendar."),
  });

  // --- LOGOUT ---
  const logout = () => {
    setToken(null);
    setProfile(null);
    googleLogout();
  };

  return (
    <GoogleAuthContext.Provider value={{ token, profile, login, logout }}>
      {children}
    </GoogleAuthContext.Provider>
  );
}

// --- HOOK de acceso rápido ---
export const useGoogleAuth = () => useContext(GoogleAuthContext);

// --- PROVEEDOR raíz para envolver la App ---
export function GoogleAuthRootProvider({ children }) {
  return (
    <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
      <GoogleAuthProvider>{children}</GoogleAuthProvider>
    </GoogleOAuthProvider>
  );
}
