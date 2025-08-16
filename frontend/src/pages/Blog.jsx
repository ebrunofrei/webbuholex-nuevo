// src/pages/Blog.jsx
import React, { useEffect, useState } from "react";
import { obtenerArticulosBlog, eliminarArticuloBlog } from "@/services/firebaseBlogService";
import BlogPublicarCard from "@/components/BlogPublicarCard";
import { useUserAdminStatus } from "@/hooks/useUserAdminStatus";
import toast, { Toaster } from "react-hot-toast";
import PageContainer from "@/components/PageContainer";
import BlogLectorModal from "@/components/BlogLectorModal";
import BlogPublicarEditarModal from "@/components/BlogPublicarEditarModal";

export default function Blog() {
  const { isAdmin, checking } = useUserAdminStatus();
  const [articulos, setArticulos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [lectorModal, setLectorModal] = useState(null);

  // Cargar artículos al inicio y tras publicar
  const cargarArticulos = async () => {
    setCargando(true);
    const lista = await obtenerArticulosBlog();
    setArticulos(lista);
    setCargando(false);
  };

  useEffect(() => { cargarArticulos(); }, []);

  // Eliminar artículo (solo admin)
  const handleEliminar = async (id) => {
    if (!window.confirm("¿Seguro que deseas eliminar este artículo?")) return;
    await eliminarArticuloBlog(id);
    toast.success("Artículo eliminado");
    cargarArticulos();
  };

  return (
    <PageContainer className="max-w-4xl">
      <Toaster position="top-center" />
      <h1 className="text-3xl font-extrabold text-[#3e2723] text-center mb-4">
        Blog Jurídico de BúhoLex
      </h1>

      {/* Solo para admin */}
      {!checking && isAdmin && (
        <BlogPublicarCard onPublicado={cargarArticulos} />
      )}

      <div className="mt-8 flex flex-col gap-8 items-center">
        {cargando && (
          <div className="text-[#7a2518] text-lg">Cargando artículos...</div>
        )}
        {!cargando && articulos.length === 0 && (
          <div className="text-[#3e2723] text-lg">No hay artículos publicados aún.</div>
        )}
        {!cargando && articulos.map((art) => (
          <div
            key={art.id}
            className="w-full bg-white border-2 border-[#7a2518] rounded-2xl shadow p-8 flex flex-col gap-2 relative transition hover:shadow-lg"
            style={{ wordBreak: "break-word" }}
          >
            {art.urlPortada && (
              <img
                src={art.urlPortada}
                alt="portada"
                className="w-full max-h-72 object-cover rounded mb-4"
              />
            )}
            <h2 className="text-xl md:text-2xl font-bold text-[#7a2518] mb-2">
              {art.titulo}
            </h2>
            <div className="text-[#3e2723] font-semibold mb-1">
              {art.autor} · <span className="text-xs">{art.categoria}</span>
            </div>
            <div className="text-gray-800 mb-2 italic">{art.resumen}</div>
            <div
              className="text-[#222] whitespace-pre-line mb-2"
              style={{ fontSize: "1.08em", lineHeight: "1.65" }}
            >
              {art.contenido.length > 350
                ? art.contenido.slice(0, 350) + "..."
                : art.contenido}
            </div>
            {art.tags && art.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {art.tags.map((tag, i) => (
                  <span
                    key={i}
                    className="px-3 py-1 rounded bg-[#7a2518] text-white text-xs"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
            <div className="flex items-center justify-between mt-4">
              <button
                onClick={() => setLectorModal(art)}
                className="px-4 py-1 rounded bg-[#3e2723] text-white text-xs font-bold hover:bg-[#7a2518] transition"
              >
                Ver más
              </button>
              {isAdmin && (
                <button
                  onClick={() => handleEliminar(art.id)}
                  className="px-4 py-1 rounded bg-red-700 text-white text-xs font-bold hover:bg-red-900 transition"
                >
                  Eliminar
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Modal lector */}
      {lectorModal && (
        <BlogLectorModal
          articulo={lectorModal}
          onClose={() => setLectorModal(null)}
        />
      )}
    </PageContainer>
  );
}
