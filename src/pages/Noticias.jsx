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

  const fetchNoticias = async (reset = false) => {
    try {
      setLoading(true);
      const res = await fetch(
        `${BASE_URL}/noticias?tipo=${tipo}&page=${page}&limit=${PAGE_SIZE}`
      );
      const data = await res.json();
      const arr = Array.isArray(data.items) ? data.items : data;
      setItems(reset ? arr : [...items, ...arr]);
    } catch (err) {
      console.error("Error noticias:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNoticias(true);
  }, [tipo]);

  return (
    <section className="p-6">
      <h2 className="text-2xl font-bold text-red-700 mb-3">Noticias</h2>

      {loading && <p>Cargando...</p>}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {items.map((n) => (
          <div
            key={n._id || n.id}
            className="bg-white rounded-md p-3 shadow-sm hover:shadow"
          >
            <h3 className="font-semibold text-brown-800 mb-2">{n.titulo}</h3>
            <p className="text-gray-600 text-sm line-clamp-3">
              {n.resumen || "Sin resumen"}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
