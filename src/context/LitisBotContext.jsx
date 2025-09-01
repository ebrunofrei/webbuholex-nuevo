// src/context/LitisBotContext.jsx
import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, setDoc, collection, getDocs } from "firebase/firestore";
import { db } from "@/firebase";
import { toast } from "react-toastify"; // asegúrate de tener react-toastify instalado

export const LitisBotContext = createContext();

// --- HOOK ---
export function useLitisBot() {
  return useContext(LitisBotContext);
}

// --- PROVIDER ---
export function LitisBotProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isPro, setIsPro] = useState(false);
  const [botActive, setBotActive] = useState(true);
  const [agenda, setAgenda] = useState([]);
  const [notificaciones, setNotificaciones] = useState([]);
  const [loading, setLoading] = useState(true);

  // --- Listener Auth ---
  useEffect(() => {
    const auth = getAuth();
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        try {
          const perfilRef = doc(db, "usuarios", firebaseUser.uid);
          const perfilSnap = await getDoc(perfilRef);
          setIsPro(perfilSnap.exists() && perfilSnap.data().pro === true);
        } catch (err) {
          console.error("Error al cargar perfil:", err);
          toast.error("No se pudo cargar el perfil de usuario.");
          setIsPro(false);
        }
      } else {
        setIsPro(false);
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // --- Recordatorios ---
  const addRecordatorio = useCallback(async ({ titulo, fecha, expedienteId, descripcion }) => {
    if (!user) {
      toast.error("Debes iniciar sesión.");
      return;
    }
    try {
      const recordatorioRef = doc(db, "usuarios", user.uid, "recordatorios", `${Date.now()}`);
      await setDoc(recordatorioRef, {
        titulo,
        fecha,
        expedienteId: expedienteId || null,
        descripcion: descripcion || "",
        completado: false,
        creado: new Date().toISOString(),
      });
      toast.success("Recordatorio agregado");
    } catch (error) {
      console.error("Error al guardar recordatorio:", error);
      toast.error("Error al guardar recordatorio.");
    }
  }, [user]);

  // --- Alertas externas ---
  const enviarAlerta = useCallback(async ({ mensaje, telefono }) => {
    console.log("Enviando alerta →", { mensaje, telefono });
    toast.info("Alerta enviada por WhatsApp/SMS (Demo).");
  }, []);

  // --- Análisis de documentos ---
  const analizarPDF = useCallback(async (archivoPDF) => {
    console.log("Analizando PDF →", archivoPDF);
    return {
      plazos: [],
      resumen: "Análisis automatizado del PDF (solo PRO)."
    };
  }, []);

  // --- Notificaciones ---
  const fetchNotificaciones = useCallback(async () => {
    if (!user) return;
    try {
      const notiCol = collection(db, "usuarios", user.uid, "notificaciones");
      const snap = await getDocs(notiCol);
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setNotificaciones(data);
    } catch (err) {
      console.error("Error al cargar notificaciones:", err);
      setNotificaciones([]);
    }
  }, [user]);

  // --- Consultas al bot ---
  const consultarLitisBot = useCallback(async (pregunta, archivo = null) => {
    if (!user) return "Inicia sesión para usar el Asistente Legal.";
    if (isPro) {
      return "Respuesta PRO: Solución legal avanzada.";
    }
    return "Respuesta gratuita: Esto es lo que puedo decirte...";
  }, [user, isPro]);

  // --- Wrapper PRO ---
  const requirePro = (fn) => (...args) => {
    if (!isPro) {
      toast.info("Funcionalidad solo para usuarios PRO.");
      return null;
    }
    return fn(...args);
  };

  const agendarDesdePDF = requirePro(async (archivoPDF) => {
    return await analizarPDF(archivoPDF);
  });

  // --- Contexto expuesto ---
  const value = {
    user,
    isPro,
    botActive,
    setBotActive,
    loading,
    agenda,
    setAgenda,
    notificaciones,
    setNotificaciones,
    addRecordatorio,
    fetchNotificaciones,
    enviarAlerta,
    analizarPDF,
    consultarLitisBot,
    agendarDesdePDF,
  };

  return (
    <LitisBotContext.Provider value={value}>
      {children}
    </LitisBotContext.Provider>
  );
}
