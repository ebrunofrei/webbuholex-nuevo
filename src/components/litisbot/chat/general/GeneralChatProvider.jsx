import { createContext, useContext } from "react";
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
   * Home Chat es 100% público.
   * No depende de auth ni de usuario.
   */
  const chat = useGeneralChat();

  return (
    <GeneralChatContext.Provider value={chat}>
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
