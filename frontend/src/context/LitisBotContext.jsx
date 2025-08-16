import React, { createContext, useContext, useState, useEffect } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/services/firebaseConfig";
import { toast } from "react-toastify"; // <<--- asegurate de tener instalado react-toastify

export const LitisBotContext = createContext();

export function LitisBotProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isPro, setIsPro] = useState(false);
  const [botActive, setBotActive] = useState(true);
  const [agenda, setAgenda] = useState([]);
  const [notificaciones, setNotificaciones] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const auth = getAuth();
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        const perfilRef = doc(db, "usuarios", firebaseUser.uid);
        const perfilSnap = await getDoc(perfilRef);
        setIsPro(perfilSnap.exists() && perfilSnap.data().pro === true);
      } else {
        setIsPro(false);
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const addRecordatorio = async ({ titulo, fecha, expedienteId, descripcion }) => {
    if (!user) {
      toast.error("Debes iniciar sesión.");
      return;
    }
    try {
      const recordatorioRef = doc(db, "usuarios", user.uid, "recordatorios", `${Date.now()}`);
      await setDoc(recordatorioRef, {
        titulo,
        fecha,
        expedienteId,
        descripcion,
        completado: false,
        creado: new Date().toISOString(),
      });
      toast.success("Recordatorio agregado");
    } catch (error) {
      toast.error("Error al guardar recordatorio.");
    }
  };

  const enviarAlerta = async ({ mensaje, telefono }) => {
    // Aquí va integración real con backend para WhatsApp/SMS si tienes API o servicio.
    toast.info("Alerta enviada por WhatsApp/SMS (Demo).");
  };

  const analizarPDF = async (archivoPDF) => {
    // Lógica para IA, demo:
    return {
      plazos: [],
      resumen: "Análisis automatizado del PDF (solo PRO)."
    };
  };

  const fetchNotificaciones = async () => {
    setNotificaciones([]); // Demo: integrar aquí Firestore.
  };

  const consultarLitisBot = async (pregunta, archivo = null) => {
    if (!user) {
      return "Inicia sesión para usar el Asistente Legal.";
    }
    if (isPro) {
      return "Respuesta PRO: Solución legal avanzada.";
    }
    return "Respuesta gratuita: Esto es lo que puedo decirte...";
  };

  const requirePro = (fn) => (...args) => {
    if (!isPro) {
      toast.info("Funcionalidad solo para usuarios PRO.");
      return null;
    }
    return fn(...args);
  };

  const agendarDesdePDF = requirePro(async (archivoPDF) => {
    const analisis = await analizarPDF(archivoPDF);
    return analisis;
  });

  return (
    <LitisBotContext.Provider value={{
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
      agendarDesdePDF, // Solo PRO
    }}>
      {children}
    </LitisBotContext.Provider>
  );
}

export function useLitisBot() {
  return useContext(LitisBotContext);
}
