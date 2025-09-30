// src/components/BlogCard.jsx
import React, { useState } from "react";
import { eliminarArticuloBlog, editarArticuloBlog } from "@/services/firebaseBlogService";
import { useUserAdminStatus } from "@/hooks/useUserAdminStatus";

export default function BlogCard({ articulo, onEdit, onDeleted }) {
  const { isAdmin } = useUserAdminStatus();
  const [editMode, setEditMode] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [showFull, setShowFull] = useState(false);
  const [form, setForm] = useState({
    titulo: articulo.titulo || "",
    resumen: articulo.resumen || "",
    contenido: articulo.contenido || "",
    categoria: articulo.categoria || "",
    tags: Array.isArray(articulo.tags) ? articulo.tags.join(", ") : "",
  });

  // --- Manejar cambios en edición ---
  const handleInputChange = e => {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
  };

  // --- Guardar edición ---
  const handleSaveEdit = async () => {
    await editarArticuloBlog(articulo.id, {
      ...articulo,
      ...form,
      tags: form.tags.split(",").map(t => t.trim()).filter(Boolean),
    });
    setEditMode(false);
    onEdit && onEdit();
  };

  // --- Eliminar con confirmación ---
  const handleDelete = async () => {
    if (!confirmando) {
      setConfirmando(true);
      return;
    }
    await eliminarArticuloBlog(articulo.id, articulo.urlPortada);
    setConfirmando(false);
    onDeleted && onDeleted();
  };

  // --- Formato de fecha amigable ---
  const getFecha = () => {
    try {
      if (articulo.fecha?.toDate) {
        return articulo.fecha.toDate().toLocaleDateString();
      }
      if (typeof articulo.fecha === "string") {
        return new Date(articulo.fecha).toLocaleDateString();
      }
    } catch (e) { /* empty */ }
    return "";
  };

  return (
    <div className="bg-white border-2 border-[#7a2518] rounded-xl shadow p-6 mb-6 max-w-xl mx-auto relative">
      {/* Imagen de portada */}
      {articulo.urlPortada && (
        <img
          src={articulo.urlPortada}
          alt="Portada"
          className="w-full h-48 object-cover rounded mb-2"
        />
      )}

      {/* Edición Inline */}
      {editMode ? (
        <div className="space-y-2">
          <input
            name="titulo"
            value={form.titulo}
            onChange={handleInputChange}
            className="font-bold text-xl w-full border p-2 rounded"
            placeholder="Título"
          />
          <input
            name="resumen"
            value={form.resumen}
            onChange={handleInputChange}
            className="w-full border p-2 rounded"
            placeholder="Resumen"
          />
          <textarea
            name="contenido"
            value={form.contenido}
            onChange={handleInputChange}
            className="w-full border p-2 rounded min-h-[90px]"
            placeholder="Contenido completo"
          />
          <input
            name="categoria"
            value={form.categoria}
            onChange={handleInputChange}
            className="w-full border p-2 rounded"
            placeholder="Categoría"
          />
          <input
            name="tags"
            value={form.tags}
            onChange={handleInputChange}
            className="w-full border p-2 rounded"
            placeholder="Tags, separados por coma"
          />
          <div className="flex gap-2 mt-2">
            <button className="bg-[#7a2518] text-white px-4 py-2 rounded font-bold" onClick={handleSaveEdit}>Guardar</button>
            <button className="bg-gray-200 text-[#7a2518] px-3 py-2 rounded" onClick={() => setEditMode(false)}>Cancelar</button>
          </div>
        </div>
      ) : (
        <>
          {/* Título y resumen */}
          <h3 className="font-bold text-xl text-[#7a2518]">{articulo.titulo}</h3>
          <div className="mb-1 flex flex-col md:flex-row md:items-center md:gap-4">
            <span className="text-[#222] font-semibold">{articulo.autor}</span>
            {articulo.categoria && <span className="text-xs text-[#7a2518] italic">· {articulo.categoria}</span>}
            {getFecha() && <span className="text-xs text-gray-500 ml-2">{getFecha()}</span>}
          </div>
          <p className="italic text-[#3e2723] mb-1">{articulo.resumen}</p>
          <div className="text-[#3e2723] mb-2 whitespace-pre-line">
            {articulo.contenido.slice(0, 350)}
            {articulo.contenido.length > 350 ? "..." : ""}
          </div>
          {/* Tags */}
          <div className="mb-2 flex flex-wrap gap-2">
            {Array.isArray(articulo.tags) && articulo.tags.map((tag, i) => (
              <span key={i} className="bg-[#7a2518] text-white px-2 py-0.5 rounded text-xs">{tag}</span>
            ))}
          </div>
          {/* Botón “Ver más” */}
          {articulo.contenido.length > 350 && (
            <button
              className="px-3 py-1 rounded bg-blue-700 text-white font-semibold mt-2"
              onClick={() => setShowFull(true)}
            >
              Ver más
            </button>
          )}
        </>
      )}

      {/* Modal de “Ver más” */}
      {showFull && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl max-w-2xl w-full relative shadow-xl border">
            <button
              className="absolute top-2 right-2 text-[#7a2518] font-bold"
              onClick={() => setShowFull(false)}
            >✕</button>
            <h3 className="font-bold text-2xl mb-3">{articulo.titulo}</h3>
            <div className="mb-1 flex flex-col md:flex-row md:items-center md:gap-4">
              <span className="text-[#222] font-semibold">{articulo.autor}</span>
              {articulo.categoria && <span className="text-xs text-[#7a2518] italic">· {articulo.categoria}</span>}
              {getFecha() && <span className="text-xs text-gray-500 ml-2">{getFecha()}</span>}
            </div>
            <p className="italic mb-2">{articulo.resumen}</p>
            <div className="whitespace-pre-line text-[#3e2723] mb-2">{articulo.contenido}</div>
            {/* Portada grande en modal, si existe */}
            {articulo.urlPortada && (
              <img
                src={articulo.urlPortada}
                alt="Portada"
                className="w-full h-72 object-cover rounded mb-2"
              />
            )}
            <div className="flex flex-wrap gap-2 mt-2">
              {Array.isArray(articulo.tags) && articulo.tags.map((tag, i) => (
                <span key={i} className="bg-[#7a2518] text-white px-2 py-0.5 rounded text-xs">{tag}</span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Botones de Admin */}
      {isAdmin && !editMode && (
        <div className="flex gap-3 mt-4">
          <button
            className="px-3 py-1 rounded bg-[#7a2518] text-white font-bold"
            onClick={() => setEditMode(true)}
          >
            Editar
          </button>
          {confirmando ? (
            <>
              <span className="text-red-700 font-semibold text-xs px-2 py-1 rounded">
                ¿Eliminar? <b>Esta acción no se puede deshacer</b>
              </span>
              <button
                className="px-3 py-1 rounded bg-red-700 text-white font-bold"
                onClick={handleDelete}
              >
                Confirmar
              </button>
              <button
                className="px-2 py-1 rounded bg-gray-200 text-[#3e2723] font-semibold"
                onClick={() => setConfirmando(false)}
              >
                Cancelar
              </button>
            </>
          ) : (
            <button
              className="px-3 py-1 rounded bg-red-700 text-white font-bold"
              onClick={handleDelete}
            >
              Eliminar
            </button>
          )}
        </div>
      )}
    </div>
  );
}
