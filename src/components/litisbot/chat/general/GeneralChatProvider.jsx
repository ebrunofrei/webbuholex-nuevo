// ============================================================================
// 📁 GeneralChatProvider.jsx — HOME CHAT (PUBLIC) R7.7++
// ----------------------------------------------------------------------------
// - Chat 100% público (NO AUTH, NO USER)
// - Estado estable: nunca se resetea al enviar mensajes
// - Fuente única: useGeneralChat()
// - Aislado del sistema de autenticación
// ============================================================================

import { createContext, useContext, useMemo } from "react";
import { useGeneralChat } from "./useGeneralChat";

// ---------------------------------------------------------------------------
// CONTEXT
// ---------------------------------------------------------------------------
const GeneralChatContext = createContext(null);

// ---------------------------------------------------------------------------
// PROVIDER (PUBLIC — NO AUTH)
// ---------------------------------------------------------------------------
export function GeneralChatProvider({ children }) {
  /**
   * ⚠️ CLAVE ARQUITECTÓNICA
   * Home Chat NO depende de usuario.
   * Siempre es "public".
   */
  const chat = useGeneralChat({ id: "public" });

  /**
   * useMemo para garantizar referencia estable
   * (evita renders innecesarios en Layout / Sidebar)
   */
  const value = useMemo(() => chat, [chat]);

  return (
    <GeneralChatContext.Provider value={value}>
      {children}
    </GeneralChatContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// HOOK DE CONSUMO
// ---------------------------------------------------------------------------
export function useGeneralChatContext() {
  const ctx = useContext(GeneralChatContext);

  if (!ctx) {
    throw new Error(
      "useGeneralChatContext must be used within <GeneralChatProvider />"
    );
  }

  return ctx;
}
