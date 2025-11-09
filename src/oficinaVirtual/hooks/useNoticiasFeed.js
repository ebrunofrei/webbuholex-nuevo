// src/oficinaVirtual/hooks/useNoticiasFeed.js
import { useEffect, useState } from "react";
import { getGeneralNews } from "@/services/noticiasClientService.js"; // o tu cliente robusto

export default function useNoticiasFeed({ tipoInicial = "juridica", especialidad = "penal", pageSize = 12 }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState("");

  async function fetchPage(p = 1, reset = false) {
    setLoading(true); setError("");
    try {
      let resp;
      if (tipoInicial === "juridica") {
        // tu backend de jurídicas
        const qs = { tipo: "juridica", especialidad, page: p, limit: pageSize, lang: "es" };
        resp = await getGeneralNews(qs); // si tienes otro método, úsalo aquí
      } else {
        // generales por tema (fallback)
        resp = await getGeneralNews({ page: p, limit: pageSize, lang: "es", tema: "actualidad" });
      }
      const arr = Array.isArray(resp?.items) ? resp.items : [];
      setItems(prev => (reset ? arr : [...prev, ...arr]));
      setHasMore(arr.length >= pageSize);
      setPage(p);
    } catch (e) {
      setError(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchPage(1, true); }, [tipoInicial, especialidad]);

  return { items, loading, error, page, hasMore, fetchNext: () => fetchPage(page + 1) };
}
