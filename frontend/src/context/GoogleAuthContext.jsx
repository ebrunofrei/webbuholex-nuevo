// src/context/GoogleAuthContext.jsx
import React, { createContext, useContext, useState } from "react";
import { GoogleOAuthProvider, googleLogout, useGoogleLogin } from "@react-oauth/google";

const GoogleAuthContext = createContext();

export function GoogleAuthProvider({ children }) {
  const [token, setToken] = useState(null);
  const [profile, setProfile] = useState(null);

  // Login
  const login = useGoogleLogin({
    scope: "https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/userinfo.profile",
    onSuccess: async (tokenResponse) => {
      setToken(tokenResponse.access_token);
      // Puedes pedir info extra del perfil si quieres
      const resp = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
        headers: { Authorization: `Bearer ${tokenResponse.access_token}` }
      });
      setProfile(await resp.json());
    },
    onError: () => alert("No se pudo conectar con Google Calendar."),
  });

  // Logout
  function logout() {
    setToken(null);
    setProfile(null);
    googleLogout();
  }

  return (
    <GoogleAuthContext.Provider value={{ token, profile, login, logout }}>
      {children}
    </GoogleAuthContext.Provider>
  );
}

// Hook de acceso rápido
export const useGoogleAuth = () => useContext(GoogleAuthContext);

// PROVEEDOR raíz
export function GoogleAuthRootProvider({ children }) {
  return (
    <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
      <GoogleAuthProvider>{children}</GoogleAuthProvider>
    </GoogleOAuthProvider>
  );
}
