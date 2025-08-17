import React, { createContext, useContext, useState } from "react";

const ExpedienteContext = createContext();

export function useExpediente() {
  return useContext(ExpedienteContext);
}

export function ExpedienteProvider({ children }) {
  const [expedienteActual, setExpedienteActual] = useState(null);
  return (
    <ExpedienteContext.Provider value={{ expedienteActual, setExpedienteActual }}>
      {children}
    </ExpedienteContext.Provider>
  );
}
