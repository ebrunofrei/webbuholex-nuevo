// src/hooks/useNoticias.js
import { useEffect, useState } from "react";
import { getNoticias } from "@/services/noticiasApi";

/**
 * Hook: useNoticias
 * Maneja la carga paginada de noticias desde el backend.
 *
 * @param {string} tipo - "general" | "juridica"
 * @param {number} pageSize - cantidad de noticias por página
 * @param {string} q - texto de búsqueda opcional
 * @param {string} fechaDesde - filtro de fecha inicial (ISO string)
 * @param {string} fechaHasta - filtro de fecha final (ISO string)
 */
export function useNoticias({
  tipo = "general",
  pageSize = 12,
  q = "",
  fechaDesde,
  fechaHasta,
} = {}) {
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState(null);

  // 🔄 Resetear noticias cuando cambian los filtros
  useEffect(() => {
    setItems([]);
    setPage(1);
    setHasMore(true);
  }, [tipo, q, fechaDesde, fechaHasta, pageSize]);

  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      if (!hasMore || loading) return;

      setLoading(true);
      setError(null);

      try {
        const data = await getNoticias({
          tipo,
          page,
          limit: pageSize,
          q,
          fechaDesde,
          fechaHasta,
        });

        if (!cancelled) {
          setItems((prev) => (page === 1 ? data.items : [...prev, ...data.items]));
          setHasMore(page < data.totalPages);
        }
      } catch (err) {
        if (!cancelled) {
          console.error("❌ Error en useNoticias:", err.message);
          setError(err.message);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchData();

    return () => {
      cancelled = true;
    };
  }, [page, tipo, q, fechaDesde, fechaHasta, pageSize]);

  // 👉 Exponemos estado y función para cargar más
  return {
    items,
    loading,
    error,
    hasMore,
    loadMore: () => setPage((p) => p + 1),
    refresh: () => {
      setItems([]);
      setPage(1);
      setHasMore(true);
    },
  };
}
