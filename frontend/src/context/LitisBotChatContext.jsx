import { createContext, useContext, useState } from "react";

const LitisBotChatContext = createContext();

export function useLitisBotChat() {
  return useContext(LitisBotChatContext);
}

export function LitisBotChatProvider({ children }) {
  const [visible, setVisible] = useState(false);

  const abrirChat = () => setVisible(true);
  const cerrarChat = () => setVisible(false);

  return (
    <LitisBotChatContext.Provider value={{ visible, abrirChat, cerrarChat }}>
      {children}
    </LitisBotChatContext.Provider>
  );
}
