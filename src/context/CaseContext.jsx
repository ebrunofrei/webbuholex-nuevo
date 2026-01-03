// ============================================================================
// 🦉 BÚHOLEX | CaseContext (Enterprise SaaS – FINAL)
// ============================================================================

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";

import { useAuth } from "@/context/AuthContext";
import { joinApi } from "@/services/apiBase";

// ----------------------------------------------------------------------------
// Context
// ----------------------------------------------------------------------------

const CaseContext = createContext(null);

export function useCase() {
  const ctx = useContext(CaseContext);
  if (!ctx) {
    throw new Error("useCase debe usarse dentro de <CaseProvider>");
  }
  return ctx;
}

// ----------------------------------------------------------------------------
// Provider
// ----------------------------------------------------------------------------

export function CaseProvider({ children }) {
  const { user } = useAuth();

  const [cases, setCases] = useState([]);
  const [caseActivo, setCaseActivo] = useState(null);
  const [loadingCase, setLoadingCase] = useState(true);

  // --------------------------------------------------------------------------
  // Crear caso (SaaS silencioso)
  // --------------------------------------------------------------------------
  const crearCaso = useCallback(
    async ({ title, area, jurisdiction } = {}) => {
      if (!user) throw new Error("Usuario no autenticado");

      const token = await user.getIdToken();

      const res = await fetch(joinApi("/cases"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: title || "Caso inicial",
          area: area || "general",
          jurisdiction: jurisdiction || "general",
        }),
      });

      const data = await res.json();

      if (!res.ok || !data?.case) {
        throw new Error("No se pudo crear el caso inicial");
      }

      setCases([data.case]);
      setCaseActivo(data.case);

      return data.case;
    },
    [user]
  );

  // --------------------------------------------------------------------------
  // Bootstrap: cargar casos o auto-crear
  // --------------------------------------------------------------------------
  const cargarCases = useCallback(async () => {
    if (!user) {
      setCases([]);
      setCaseActivo(null);
      setLoadingCase(false);
      return;
    }

    setLoadingCase(true);

    try {
      const token = await user.getIdToken();

      const res = await fetch(joinApi("/cases"), {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();

      if (!res.ok || !Array.isArray(data?.cases)) {
        throw new Error("Error cargando casos");
      }

      // 🧠 CASOS EXISTENTES
      if (data.cases.length > 0) {
        setCases(data.cases);
        setCaseActivo(data.cases[0]);
        return;
      }

      // 🚀 AUTO-CREATE SaaS
      await crearCaso();

    } catch (err) {
      console.error("CaseContext:", err);
      setCases([]);
      setCaseActivo(null);
    } finally {
      setLoadingCase(false);
    }
  }, [user, crearCaso]);

  // --------------------------------------------------------------------------
  // Init
  // --------------------------------------------------------------------------
  useEffect(() => {
    cargarCases();
  }, [cargarCases]);

  // --------------------------------------------------------------------------
  // API expuesta
  // --------------------------------------------------------------------------
  const value = {
    cases,
    caseActivo,
    loadingCase,
    caseId: caseActivo?._id || null,
    caseContext: caseActivo
      ? {
          caseId: caseActivo._id,
          title: caseActivo.title,
          area: caseActivo.area,
          jurisdiction: caseActivo.jurisdiction,
          status: caseActivo.status,
        }
      : null,
    crearCaso,
    recargarCases: cargarCases,
    seleccionarCaso: (id) =>
      setCaseActivo(cases.find((c) => c._id === id) || null),
  };

  return (
    <CaseContext.Provider value={value}>
      {children}
    </CaseContext.Provider>
  );
}
