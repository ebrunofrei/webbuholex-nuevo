// src/context/NoticiasContext.jsx
import React, { createContext, useContext, useState, useCallback, useEffect } from "react";

const NoticiasContext = createContext();

// Hook personalizado (se exporta por separado)
export function useNoticias() {
  return useContext(NoticiasContext);
}

export function NoticiasProvider({ children }) {
  const [showNoticias, setShowNoticias] = useState(false);
  const [noticias, setNoticias] = useState([]);
  const [loading, setLoading] = useState(false);

  // Simulación de carga de noticias (puedes conectar aquí tu API o Firestore)
  const fetchNoticias = useCallback(async () => {
    setLoading(true);
    try {
      // Aquí va la lógica real para traer noticias
      setNoticias([
        { id: 1, titulo: "Nueva ley publicada", fecha: "2025-08-29" },
        { id: 2, titulo: "Reforma procesal penal", fecha: "2025-08-28" },
      ]);
    } catch (error) {
      console.error("Error cargando noticias:", error);
      setNoticias([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNoticias();
  }, [fetchNoticias]);

  const toggleNoticias = () => setShowNoticias((prev) => !prev);

  // --- Contexto expuesto ---
  const value = {
    showNoticias,
    setShowNoticias,
    toggleNoticias,
    noticias,
    setNoticias,
    fetchNoticias,
    loading,
  };

  return (
    <NoticiasContext.Provider value={value}>
      {children}
    </NoticiasContext.Provider>
  );
}
