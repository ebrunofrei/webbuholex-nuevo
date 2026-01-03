// src/context/GoogleAuthContext.jsx
import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from "react";
import { GoogleOAuthProvider, googleLogout, useGoogleLogin } from "@react-oauth/google";

const GoogleAuthContext = createContext(null);

function safeJsonParse(s, fallback = null) {
  try { return JSON.parse(s); } catch { return fallback; }
}

async function fetchGoogleProfile(accessToken) {
  // v3 userinfo funciona; v2 también. Mantenemos v3 por compat.
  const resp = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!resp.ok) throw new Error(`No se pudo obtener perfil (HTTP ${resp.status})`);
  return await resp.json();
}

export function GoogleAuthProviderInner({ children }) {
  const [token, setToken] = useState(() => sessionStorage.getItem("gcal_token") || null);
  const [profile, setProfile] = useState(() => safeJsonParse(sessionStorage.getItem("gcal_profile"), null));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // --- LOGIN (hook debe vivir DENTRO de GoogleOAuthProvider) ---
  const login = useGoogleLogin({
    // Para Calendar: mejor mínimo viable (readonly) + identidad.
    scope: [
      "openid",
      "email",
      "profile",
      "https://www.googleapis.com/auth/calendar.readonly",
    ].join(" "),
    onSuccess: async (tokenResponse) => {
      const accessToken = tokenResponse?.access_token;
      if (!accessToken) {
        setError("Google no devolvió access_token.");
        return;
      }

      setLoading(true);
      setError("");
      try {
        setToken(accessToken);
        sessionStorage.setItem("gcal_token", accessToken);

        const data = await fetchGoogleProfile(accessToken);
        setProfile(data);
        sessionStorage.setItem("gcal_profile", JSON.stringify(data));
      } catch (e) {
        console.error("Google profile error:", e);
        setError(e?.message || "No se pudo obtener el perfil de Google.");
        setToken(null);
        setProfile(null);
        sessionStorage.removeItem("gcal_token");
        sessionStorage.removeItem("gcal_profile");
      } finally {
        setLoading(false);
      }
    },
    onError: () => {
      setError("No se pudo conectar con Google (login cancelado o inválido).");
    },
  });

  const logout = useCallback(() => {
    setToken(null);
    setProfile(null);
    setError("");
    sessionStorage.removeItem("gcal_token");
    sessionStorage.removeItem("gcal_profile");
    googleLogout();
  }, []);

  const value = useMemo(
    () => ({ token, profile, loading, error, setError, login, logout, isConnected: !!token }),
    [token, profile, loading, error, login, logout]
  );

  return <GoogleAuthContext.Provider value={value}>{children}</GoogleAuthContext.Provider>;
}

export const useGoogleAuth = () => {
  const ctx = useContext(GoogleAuthContext);
  if (!ctx) throw new Error("useGoogleAuth debe usarse dentro de GoogleAuthRootProvider.");
  return ctx;
};

// Root provider: aquí vive el clientId
export function GoogleAuthRootProvider({ children }) {
  const clientId = (import.meta?.env?.VITE_GOOGLE_CLIENT_ID || "").trim();

  // Si falta clientId, NO reventamos toda la app: solo deshabilitamos Google.
  if (!clientId) {
    return (
      <GoogleAuthContext.Provider
        value={{
          token: null,
          profile: null,
          loading: false,
          error: "Falta VITE_GOOGLE_CLIENT_ID (Google Calendar deshabilitado).",
          setError: () => {},
          login: () => {},
          logout: () => {},
          isConnected: false,
        }}
      >
        {children}
      </GoogleAuthContext.Provider>
    );
  }

  return (
    <GoogleOAuthProvider clientId={clientId}>
      <GoogleAuthProviderInner>{children}</GoogleAuthProviderInner>
    </GoogleOAuthProvider>
  );
}
