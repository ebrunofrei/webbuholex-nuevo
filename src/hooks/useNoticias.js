// src/hooks/useNoticias.js
import { useEffect, useState } from "react";
import { getNoticias } from "@/services/newsApi";

export function useNoticias(tipo = "general", pageSize = 8) {
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function fetchData() {
      setLoading(true);
      const data = await getNoticias(tipo, page, pageSize);
      if (!cancelled) {
        if (page === 1) {
          setItems(data.items);
        } else {
          setItems((prev) => [...prev, ...data.items]);
        }
        setHasMore(data.hasMore);
      }
      setLoading(false);
    }
    fetchData();
    return () => { cancelled = true; };
  }, [tipo, page]);

  return { items, loading, hasMore, setPage, page };
}
