// src/components/NoticiasSlider.jsx
import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom"; // <—
import { getNoticiasRobust, clearNoticiasCache, API_BASE } from "@/services/noticiasClientService";

const PROVIDERS_TOP = ["elpais", "elcomercio", "rpp"]; // ajusta a gusto

export default function NoticiasSlider({ variant = "inline", className = "" }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const { pathname } = useLocation(); // <—

  // 🔒 Solo render en rutas permitidas:
  const allow =
    pathname.startsWith("/noticias") ||
    pathname.startsWith("/oficinavirtual") ||
    pathname.startsWith("/oficina-virtual");

  useEffect(() => {
    if (!allow) return;
    (async () => {
      setLoading(true);
      try {
        const { items: arr } = await getNoticiasRobust({
          tipo: "general",
          page: 1,
          limit: 10,
          lang: "es",
          providers: PROVIDERS_TOP,
        });
        setItems((arr || []).slice(0, 10));
      } finally {
        setLoading(false);
      }
    })();
  }, [allow]);

  if (!allow) return null; // ⛔️ no se muestra en Home

  return (
    <aside className={`blx-actualidad w-full h-full bg-white/0 ${className}`}>
      <div className="sticky top-0">
        <h3 className="text-base font-bold mb-3 text-[#5C2E0B]">Actualidad</h3>
        {loading && <p className="text-sm text-gray-500">Cargando…</p>}
        {!loading && items.length === 0 && (
          <p className="text-sm text-gray-500">Sin noticias.</p>
        )}
        <ul className="space-y-3">
          {items.map((n, idx) => (
            <li key={n.id || n.enlace || idx} className="border rounded-lg p-3 bg-white hover:shadow transition">
              <a
                href={n.enlace}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-sm hover:underline"
              >
                {n.titulo}
              </a>
              <div className="text-[11px] text-gray-500 flex items-center gap-2 mt-1">
                {n.fuente && <span className="px-1.5 py-0.5 border rounded">{n.fuente}</span>}
                {n.fecha && <span>{new Date(n.fecha).toLocaleDateString("es-PE")}</span>}
              </div>
            </li>
          ))}
        </ul>
      </div>
      {/* RESET anti-fugas */}
      <style>{`
        .blx-actualidad { position: static !important; inset: auto !important; right: auto !important; left: auto !important; bottom: auto !important; z-index: 1 !important; background: transparent; }
        .blx-actualidad h3 { position: static !important; }
      `}</style>
    </aside>
  );
}
