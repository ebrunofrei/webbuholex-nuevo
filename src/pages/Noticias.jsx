import React, { useState, useEffect } from "react";
import { asAbsoluteUrl } from "@/utils/apiUrl";

const BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  "https://buholex-news-proxy-production.up.railway.app/api";
const PAGE_SIZE = 9;

export default function Noticias({ tipo = "general" }) {
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true); // Flag to handle infinite scrolling

  // Fetch news based on the type (general or other)
  const fetchNoticias = async (reset = false) => {
    try {
      setLoading(true);
      const res = await fetch(
        `${BASE_URL}/noticias?tipo=${tipo}&page=${page}&limit=${PAGE_SIZE}`
      );
      const data = await res.json();
      const arr = Array.isArray(data.items) ? data.items : data;

      setItems(reset ? arr : [...items, ...arr]);
      setHasMore(arr.length === PAGE_SIZE); // If less than PAGE_SIZE, stop infinite scrolling
    } catch (err) {
      console.error("Error noticias:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNoticias(true);
  }, [tipo]);

  // Infinite scroll: Trigger fetching when user scrolls to the bottom
  useEffect(() => {
    const handleScroll = () => {
      if (
        window.innerHeight + document.documentElement.scrollTop ===
        document.documentElement.scrollHeight &&
        !loading && hasMore
      ) {
        setPage((prev) => prev + 1); // Load next page
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [loading, hasMore]);

  return (
    <section className="p-6">
      <h2 className="text-2xl font-bold text-red-700 mb-3">Noticias</h2>

      {loading && (
        <div className="text-center text-gray-500">Cargando...</div>
      )}

      {/* Noticias Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {items.map((n) => (
          <div
            key={n._id || n.id}
            className="bg-white rounded-md p-3 shadow-sm hover:shadow-lg transition-transform transform hover:scale-105"
          >
            <h3 className="font-semibold text-brown-800 mb-2 text-lg">
              {n.titulo}
            </h3>
            <p className="text-gray-600 text-sm line-clamp-3">{n.resumen || "Sin resumen"}</p>
          </div>
        ))}
      </div>

      {/* Load more message */}
      {hasMore && !loading && (
        <div className="text-center py-4">
          <button
            onClick={() => fetchNoticias(false)}
            className="bg-red-500 text-white px-4 py-2 rounded-full hover:bg-red-600 transition-all"
          >
            Cargar más
          </button>
        </div>
      )}

      {/* No more results */}
      {!hasMore && !loading && (
        <div className="text-center py-4 text-gray-500">
          No hay más noticias.
        </div>
      )}
    </section>
  );
}
