// src/pages/Noticias.jsx
import React, { useEffect, useState } from "react";
import { asAbsoluteUrl } from "@/utils/apiUrl";

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
  const PAGE_SIZE = 9;

  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const BASE_URL =
    tipo === "juridica"
      ? asAbsoluteUrl("/api/noticias-juridicas")
      : asAbsoluteUrl("/api/noticias");

  const loadNoticias = async (p = 1, replace = false) => {
    if (loading) return;
    setLoading(true);
    setError(null);

    try {
      const url = `${BASE_URL}?page=${p}&limit=${PAGE_SIZE}`;
      const res = await fetch(url);
      const ct = res.headers.get("content-type") || "";
      if (!res.ok || !/json/i.test(ct)) throw new Error(`Respuesta inválida (${res.status})`);

      const data = normalizeResponse(await res.json());

      setItems((prev) => {
        if (replace) return data.items || [];
        const prevSafe = prev || [];
        const nuevos = (data.items || []).filter(
          (n) => !prevSafe.some((p) => p.enlace === n.enlace || p.titulo === n.titulo)
        );
        return [...prevSafe, ...nuevos];
      });

      setHasMore(Boolean(data.hasMore));
      setPage(p);
    } catch (e) {
      console.error(`❌ Error cargando noticias (${tipo}):`, e);
      setError("No se pudieron cargar las noticias.");
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNoticias(1, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tipo]);

  return (
    <section className="container mx-auto px-4 py-8">
      <h1 className="text-2xl md:text-3xl font-bold mb-6 text-[#b03a1a]">
        {tipo === "juridica" ? "Noticias Jurídicas" : "Noticias Generales"}
      </h1>

      {error && <p className="text-center text-red-500">{error}</p>}

      {(items || []).length === 0 && !loading && !error && (
        <p className="text-center text-gray-500">
          No hay noticias {tipo} por el momento.
        </p>
      )}

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {(items || []).map((n, i) => (
          <article
            key={`${n.enlace || n.url || n.titulo || "noticia"}-${i}`}
            className="border rounded-lg bg-white shadow-sm hover:shadow-md transition flex flex-col overflow-hidden"
          >
            {n.video ? (
              <video controls className="w-full h-40 object-cover">
                <source src={n.video} type="video/mp4" />
              </video>
            ) : n.imagen ? (
              <img
                src={n.imagen ? `/api/media?url=${encodeURIComponent(n.imagen)}` : "/assets/default-news.jpg"}
                alt={n.titulo || "Noticia"}
                className="w-full h-40 object-cover"
              />
            ) : (
              <div className="w-full h-40 bg-[#b03a1a]/10 flex items-center justify-center">
                <span className="text-[#b03a1a]/70 font-bold">Sin imagen</span>
              </div>
            )}

            <div className="p-4 flex flex-col flex-1">
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
            </div>
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
