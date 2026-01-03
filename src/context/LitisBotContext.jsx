// ============================================================================
// 🧠 LitisBotContext — Núcleo funcional del Bot (SaaS)
// ----------------------------------------------------------------------------
// - NO maneja autenticación
// - Consume AuthContext
// - Controla features, PRO y utilidades del bot
// - Seguro para producción
// ============================================================================

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
} from "react";

import { toast } from "react-toastify";
import { useAuth } from "@/context/AuthContext";

// ============================================================================
// CONTEXT
// ============================================================================

const LitisBotContext = createContext(null);

// ============================================================================
// HOOK
// ============================================================================

export function useLitisBot() {
  const ctx = useContext(LitisBotContext);
  if (!ctx) {
    throw new Error("useLitisBot debe usarse dentro de <LitisBotProvider>");
  }
  return ctx;
}

// ============================================================================
// PROVIDER
// ============================================================================

export function LitisBotProvider({ children }) {
  // 🔐 Usuario viene SOLO de AuthContext
  const { user, loading: authLoading } = useAuth();

  // --------------------------------------------------------------------------
  // STATE
  // --------------------------------------------------------------------------

  const [isPro, setIsPro] = useState(false); // luego vendrá de Mongo / backend
  const [botActive, setBotActive] = useState(true);

  const [agenda, setAgenda] = useState([]);
  const [notificaciones, setNotificaciones] = useState([]);

  // --------------------------------------------------------------------------
  // RECORDATORIOS (placeholder SaaS)
  // --------------------------------------------------------------------------

  const addRecordatorio = useCallback(
    async ({ titulo, fecha, expedienteId, descripcion }) => {
      if (!user) {
        toast.error("Debes iniciar sesión.");
        return;
      }

      // 🔒 Aquí luego conectas Mongo / backend
      toast.success("Recordatorio agregado (demo).");

      console.log("🗓️ Recordatorio:", {
        titulo,
        fecha,
        expedienteId,
        descripcion,
      });
    },
    [user]
  );

  // --------------------------------------------------------------------------
  // ALERTAS (stub)
  // --------------------------------------------------------------------------

  const enviarAlerta = useCallback(async ({ mensaje, telefono }) => {
    console.log("📣 Alerta:", { mensaje, telefono });
    toast.info("Alerta enviada (demo).");
  }, []);

  // --------------------------------------------------------------------------
  // PDF / DOCUMENTOS (stub PRO)
  // --------------------------------------------------------------------------

  const analizarPDF = useCallback(async (archivoPDF) => {
    console.log("📄 Analizando PDF:", archivoPDF);

    return {
      plazos: [],
      resumen: "Análisis automatizado del PDF (solo PRO).",
    };
  }, []);

  // --------------------------------------------------------------------------
  // BOT CORE
  // --------------------------------------------------------------------------

  const consultarLitisBot = useCallback(
    async (pregunta, archivo = null) => {
      if (!user) {
        return "Inicia sesión para usar el Asistente Legal.";
      }

      if (isPro) {
        return "Respuesta PRO: Solución legal avanzada.";
      }

      return "Respuesta gratuita: Esto es lo que puedo decirte...";
    },
    [user, isPro]
  );

  // --------------------------------------------------------------------------
  // PRO GUARD
  // --------------------------------------------------------------------------

  const requirePro = useCallback(
    (fn) =>
      (...args) => {
        if (!isPro) {
          toast.info("Funcionalidad solo para usuarios PRO.");
          return null;
        }
        return fn(...args);
      },
    [isPro]
  );

  const agendarDesdePDF = requirePro(async (archivoPDF) => {
    return analizarPDF(archivoPDF);
  });

  // --------------------------------------------------------------------------
  // CONTEXT VALUE
  // --------------------------------------------------------------------------

  const value = useMemo(
    () => ({
      // auth mirror
      user,
      loading: authLoading,

      // estado
      isPro,
      botActive,
      agenda,
      notificaciones,

      // setters
      setBotActive,
      setAgenda,
      setNotificaciones,
      setIsPro,

      // acciones
      addRecordatorio,
      enviarAlerta,
      analizarPDF,
      consultarLitisBot,
      agendarDesdePDF,
    }),
    [
      user,
      authLoading,
      isPro,
      botActive,
      agenda,
      notificaciones,
      addRecordatorio,
      enviarAlerta,
      analizarPDF,
      consultarLitisBot,
      agendarDesdePDF,
    ]
  );

  return (
    <LitisBotContext.Provider value={value}>
      {children}
    </LitisBotContext.Provider>
  );
}
