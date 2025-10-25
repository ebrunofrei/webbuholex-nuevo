import { createContext, useContext, useState, useEffect } from "react";
import {
  sugerenciasParaUsuario,
  guardarInteraccionAudiencia,
  guardarFeedbackAudiencia
} from "../../services/litisbotSugerenciasService";

import { useAuth } from "../../context/AuthContext";

const AudienciaContext = createContext();

export function useAudiencia() {
  return useContext(AudienciaContext);
}

// ---- helper para evitar sugerencias duplicadas
function dedupeStrings(arr) {
  const seen = new Set();
  const out = [];
  for (const raw of arr) {
    const s = (raw || "").trim();
    const key = s.toLowerCase();
    if (s !== "" && !seen.has(key)) {
      seen.add(key);
      out.push(s);
    }
  }
  return out;
}

export function AudienciaProvider({ children }) {
  const { user } = useAuth();

  const [mensajes, setMensajes] = useState([]);
  const [sugerencias, setSugerencias] = useState([]);
  const [micActivo, setMicActivo] = useState(false);

  // cargamos sugerencias iniciales del usuario
  useEffect(() => {
    if (user) {
      sugerenciasParaUsuario(user.uid).then((sugsIniciales = []) => {
        setSugerencias(dedupeStrings(sugsIniciales));
      });
      // aquí podrías también hidratar historial si quieres
    }
  }, [user]);

  // función SEGURA para agregar sugerencias nuevas sin duplicarlas
  function agregarSugerenciasUnicas(nuevas = []) {
    setSugerencias(prev => {
      const combinadas = [...prev, ...nuevas];
      return dedupeStrings(combinadas);
    });
  }

  // Guardar mensaje y feedback en Firestore
  async function guardarMensaje({ textoUsuario, respuestaBot, expedienteID, materia, tipo }) {
    await guardarInteraccionAudiencia({
      usuarioID: user?.uid,
      expedienteID,
      textoUsuario,
      respuestaBot,
      materia,
      tipo,
    });
  }

  // Guardar feedback útil/no útil
  async function feedbackMensaje(msgId, utilFeedback) {
    await guardarFeedbackAudiencia({
      usuarioID: user?.uid,
      msgId,
      utilFeedback,
    });
  }

  return (
    <AudienciaContext.Provider
      value={{
        mensajes,
        setMensajes,

        sugerencias,
        setSugerencias,            // <- la de siempre, aún disponible
        agregarSugerenciasUnicas,  // <- la nueva recomendada 👈

        micActivo,
        setMicActivo,

        guardarMensaje,
        feedbackMensaje,
      }}
    >
      {children}
    </AudienciaContext.Provider>
  );
}
