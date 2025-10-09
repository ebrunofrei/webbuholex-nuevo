import React, { createContext, useContext, useState, useCallback, useEffect } from "react";

// Crear el contexto de Noticias
const NoticiasContext = createContext();

// Hook para acceder al contexto de Noticias
export function useNoticias() {
  return useContext(NoticiasContext);
}

// Proveedor de Noticias
export function NoticiasProvider({ children }) {
  const [showNoticias, setShowNoticias] = useState(false);
  const [noticias, setNoticias] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Usar variables de entorno para definir la URL de la API dependiendo del entorno
  const API_URL = process.env.VITE_API_BASE_URL || "http://localhost:3000/api";  // URL en local, se sobreescribe en producción

  // Función para obtener noticias reales desde la API
  const fetchNoticias = useCallback(async () => {
    setLoading(true);
    setError(null);  // Limpiar el error en cada nueva carga
    try {
      const response = await fetch(`${API_URL}/noticias`);  // Usamos la variable de entorno
      if (!response.ok) {
        throw new Error(`Error al obtener noticias: ${response.statusText}`);
      }
      const data = await response.json();
      setNoticias(data);  // Aquí asumo que la API devuelve un array de noticias
    } catch (error) {
      console.error("Error cargando noticias:", error);
      setError("No se pudieron cargar las noticias.");  // Guardar el error
      setNoticias([]);  // Limpiar las noticias en caso de error
    } finally {
      setLoading(false);
    }
  }, [API_URL]);

  // Cargar noticias cuando el componente se monte
  useEffect(() => {
    fetchNoticias();
  }, [fetchNoticias]);

  // Alternar la visualización de noticias
  const toggleNoticias = () => setShowNoticias((prev) => !prev);

  // Exponer los valores en el contexto
  const value = {
    showNoticias,
    setShowNoticias,
    toggleNoticias,
    noticias,
    setNoticias,
    fetchNoticias,
    loading,
    error,
  };

  return (
    <NoticiasContext.Provider value={value}>
      {children}
    </NoticiasContext.Provider>
  );
}
