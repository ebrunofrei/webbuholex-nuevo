// src/pages/Noticias.jsx
import React, { useEffect, useState } from "react";
import { getNoticiasJuridicas } from "@services/newsApi";

// Normaliza la respuesta (array o { items, hasMore })
const normalizeResponse = (data) => {
  if (!data) return { items: [], hasMore: false };
  if (Array.isArray(data)) return { items: data, hasMore: false };
  if (Array.isArray(data.items)) {
    return { items: data.items, hasMore: Boolean(data.hasMore) };
  }
  return { items: [], hasMore: false };
};

export default function Noticias() {
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);

  const loadNoticias = async (p = 1, replace = false) => {
    if (loading) return;
    setLoading(true);
    try {
      const data = await getNoticiasJuridicas();
      const normalized = normalizeResponse(data);

      if (replace) {
        setItems(normalized.items);
      } else {
        setItems((prev) => [
          ...prev,
          ...normalized.items.filter(
            (n) =>
              !prev.some(
                (p) => p.enlace === n.enlace || p.titulo === n.titulo
              )
          ),
        ]);
      }

      setHasMore(normalized.hasMore);
      setPage(p);
    } catch (e) {
      console.error("❌ Error cargando noticias jurídicas:", e);
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNoticias(1, true);
  }, []);

  return (
    <section className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Noticias jurídicas</h1>

      {items.length === 0 && !loading && (
        <p className="text-center text-gray-500">
          No hay noticias jurídicas por el momento.
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((n, i) => (
          <article
            key={n.enlace || n.titulo || i}
            className="border rounded-lg p-4 bg-[#fffdfc] shadow-sm hover:shadow-md transition"
          >
            <a
              href={n.enlace}
              target="_blank"
              rel="noreferrer"
              className="underline font-semibold text-[#b03a1a] hover:text-[#a87247]"
            >
              {n.titulo || "Sin título"}
            </a>
            <p className="text-xs text-gray-500 mt-1">
              {n.fuente || "Fuente desconocida"} •{" "}
              {n.fecha &&
                new Date(n.fecha).toLocaleDateString("es-PE", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                })}
            </p>
            {n.resumen && (
              <p className="text-sm mt-2 text-[#3a2a20] opacity-85 line-clamp-4">
                {n.resumen}
              </p>
            )}
          </article>
        ))}
      </div>

      {/* Botón cargar más */}
      {hasMore && (
        <div className="mt-6 text-center">
          <button
            onClick={() => loadNoticias(page + 1)}
            disabled={loading}
            className="px-4 py-2 border rounded bg-gray-100 hover:bg-gray-200 text-[#b03a1a] font-medium"
          >
            {loading ? "Cargando..." : "Cargar más"}
          </button>
        </div>
      )}
    </section>
  );
}
