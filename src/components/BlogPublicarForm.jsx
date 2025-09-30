// src/components/BlogPublicarForm.jsx
import React, { useState } from "react";
import { subirImagenBlog, publicarArticuloBlog } from "@/services/firebaseBlogService";
import { useUserAdminStatus } from "@/hooks/useUserAdminStatus";

export default function BlogPublicarForm({ onSuccess }) {
  const { isAdmin } = useUserAdminStatus();
  const [form, setForm] = useState({
    titulo: "",
    resumen: "",
    contenido: "",
    tags: "",
    categoria: "Opinión Jurídica",
    imagen: null,
  });
  const [subiendo, setSubiendo] = useState(false);

  if (!isAdmin) return null;

  const handleChange = e => {
    const { name, value, files } = e.target;
    setForm(f => ({
      ...f,
      [name]: files ? files[0] : value,
    }));
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setSubiendo(true);
    let imagenPortada = "";
    if (form.imagen) imagenPortada = await subirImagenBlog(form.imagen);
    await publicarArticuloBlog({
      ...form,
      imagenPortada,
      tags: form.tags.split(",").map(t => t.trim()).filter(Boolean),
      fecha: new Date(),
      estado: "publicado"
    });
    setSubiendo(false);
    setForm({
      titulo: "",
      resumen: "",
      contenido: "",
      tags: "",
      categoria: "Opinión Jurídica",
      imagen: null,
    });
    onSuccess && onSuccess();
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl shadow-xl max-w-lg mx-auto space-y-3 mb-10 border-2 border-[#7a2518]">
      <h2 className="text-xl font-bold text-[#7a2518] mb-2">Publicar nuevo artículo</h2>
      <input name="titulo" value={form.titulo} onChange={handleChange} required placeholder="Título" className="w-full p-2 rounded border mb-1" />
      <input name="resumen" value={form.resumen} onChange={handleChange} required placeholder="Resumen" className="w-full p-2 rounded border mb-1" />
      <textarea name="contenido" value={form.contenido} onChange={handleChange} required placeholder="Contenido completo" className="w-full p-2 rounded border mb-1 h-32" />
      <input name="tags" value={form.tags} onChange={handleChange} placeholder="Tags (separados por coma)" className="w-full p-2 rounded border mb-1" />
      <select name="categoria" value={form.categoria} onChange={handleChange} className="w-full p-2 rounded border mb-1">
        <option>Opinión Jurídica</option>
        <option>Jurisprudencia</option>
        <option>Noticia legal</option>
      </select>
      <input type="file" name="imagen" accept="image/*" onChange={handleChange} className="w-full mb-1" />
      <button type="submit" className="bg-[#7a2518] text-white px-4 py-2 rounded font-bold hover:bg-[#581911]" disabled={subiendo}>
        {subiendo ? "Publicando..." : "Publicar"}
      </button>
    </form>
  );
}
