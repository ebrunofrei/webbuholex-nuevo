import React, { useEffect, useState } from "react";
import { getNoticias } from "@/services/newsApi";

// Normaliza la respuesta de la API
const normalizeResponse = (data) => {
  if (!data) return { items: [], hasMore: false };
  if (Array.isArray(data)) return { items: data, hasMore: false };
  if (Array.isArray(data.items)) {
    return { items: data.items, hasMore: Boolean(data.hasMore) };
  }
  return { items: [], hasMore: false };
};

export default function Noticias({ tipo = "general" }) {
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);

  const loadNoticias = async (p = 1, replace = false) => {
    if (loading) return;
    setLoading(true);
    try {
      const data = await getNoticias(tipo, p, 9); // 👈 9 noticias por página
      const normalized = normalizeResponse(data);

      setItems((prev) => {
        if (replace) return normalized.items || [];
        const prevSafe = prev || [];
        const nuevos = (normalized.items || []).filter(
          (n) =>
            !prevSafe.some(
              (p) => p.enlace === n.enlace || p.titulo === n.titulo
            )
        );
        return [...prevSafe, ...nuevos];
      });

      setHasMore(Boolean(normalized.hasMore));
      setPage(p);
    } catch (e) {
      console.error(`❌ Error cargando noticias (${tipo}):`, e);
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNoticias(1, true);
  }, [tipo]);

  return (
    <section className="container mx-auto px-4 py-8">
      <h1 className="text-2xl md:text-3xl font-bold mb-6 text-[#b03a1a]">
        {tipo === "juridicas" ? "Noticias Jurídicas" : "Noticias Generales"}
      </h1>

      {(items || []).length === 0 && !loading && (
        <p className="text-center text-gray-500">
          No hay noticias {tipo} por el momento.
        </p>
      )}

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {(items || []).map((n, i) => (
          <article
            key={`${n.enlace || n.url || n.titulo || "noticia"}-${i}`}
            className="border rounded-lg p-4 bg-white shadow-sm hover:shadow-md transition flex flex-col"
          >
            <a
              href={n.enlace || n.url || "#"}
              target="_blank"
              rel="noreferrer"
              className="underline font-semibold text-[#b03a1a] hover:text-[#a87247] line-clamp-2"
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
        <div className="mt-8 text-center">
          <button
            onClick={() => loadNoticias(page + 1)}
            disabled={loading}
            className="px-4 py-2 border rounded bg-gray-100 hover:bg-gray-200 text-[#b03a1a] font-medium disabled:opacity-50"
          >
            {loading ? "Cargando..." : "Cargar más"}
          </button>
        </div>
      )}
    </section>
  );
}
