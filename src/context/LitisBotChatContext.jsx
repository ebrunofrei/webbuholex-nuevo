// src/context/LitisBotChatContext.jsx
import { createContext, useContext, useState, useCallback } from "react";

// --- CONTEXTO ---
const LitisBotChatContext = createContext();

// --- HOOK: acceso rápido ---
export function useLitisBotChat() {
  return useContext(LitisBotChatContext);
}

// --- PROVIDER ---
export function LitisBotChatProvider({ children }) {
  const [visible, setVisible] = useState(false);
  const [messages, setMessages] = useState([]); // historial de chat
  const [loading, setLoading] = useState(false); // spinner para llamadas async

  // --- Control de visibilidad ---
  const abrirChat = useCallback(() => setVisible(true), []);
  const cerrarChat = useCallback(() => setVisible(false), []);

  // --- Función para agregar mensajes al historial ---
  const addMessage = useCallback((msg, sender = "user") => {
    setMessages((prev) => [...prev, { sender, text: msg, timestamp: Date.now() }]);
  }, []);

  // --- Simulación de envío al backend/IA ---
  const enviarMensaje = useCallback(async (msg) => {
    addMessage(msg, "user");
    setLoading(true);

    try {
      // Aquí luego conectamos con backend/IA de LitisBot
      const respuesta = `Echo: ${msg}`;
      addMessage(respuesta, "litisbot");
    } catch (err) {
      console.error("Error enviando mensaje a LitisBot:", err);
      addMessage("Hubo un error al procesar tu mensaje.", "system");
    } finally {
      setLoading(false);
    }
  }, [addMessage]);

  // --- Contexto expuesto ---
  const value = {
    visible,
    abrirChat,
    cerrarChat,
    messages,
    enviarMensaje,
    addMessage,
    loading,
  };

  return (
    <LitisBotChatContext.Provider value={value}>
      {children}
    </LitisBotChatContext.Provider>
  );
}
