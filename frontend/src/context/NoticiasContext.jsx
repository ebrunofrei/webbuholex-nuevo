import React, { createContext, useContext, useState } from "react";

const NoticiasContext = createContext();

export function useNoticias() {
  return useContext(NoticiasContext);
}

export function NoticiasProvider({ children }) {
  const [showNoticias, setShowNoticias] = useState(false);
  return (
    <NoticiasContext.Provider value={{ showNoticias, setShowNoticias }}>
      {children}
    </NoticiasContext.Provider>
  );
}
