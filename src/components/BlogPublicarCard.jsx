// src/components/BlogPublicarCard.jsx
import React, { useState } from "react";
import { subirPortadaBlog, publicarArticuloBlog } from "@/services/firebaseBlogService";
import toast from "react-hot-toast";

const CATEGORIAS = [
  "Opinión Jurídica", "Noticias", "Análisis de Jurisprudencia", "Actualidad", "Doctrina", "Tendencias", "Tecnología y Derecho"
];

export default function BlogPublicarCard({ onPublicado }) {
  const [form, setForm] = useState({
    titulo: "",
    resumen: "",
    contenido: "",
    autor: "",
    categoria: CATEGORIAS[0],
    tags: "",
    portada: null
  });
  const [preview, setPreview] = useState("");
  const [subiendo, setSubiendo] = useState(false);

  // Maneja cambios de campos
  const handleChange = e => {
    const { name, value, files } = e.target;
    if (name === "portada" && files.length) {
      setForm(f => ({ ...f, portada: files[0] }));
      setPreview(URL.createObjectURL(files[0]));
    } else {
      setForm(f => ({ ...f, [name]: value }));
    }
  };

  // Validación simple
  const camposRequeridos = ["titulo", "autor", "contenido", "resumen"];
  const valid = camposRequeridos.every(c => form[c]?.trim().length > 0);

  // Publicar
  const handleSubmit = async e => {
    e.preventDefault();
    if (!valid) {
      toast.error("Completa los campos requeridos (*)");
      return;
    }
    setSubiendo(true);
    let urlPortada = "";
    if (form.portada) {
      urlPortada = await subirPortadaBlog(form.portada, `blog/portadas/${Date.now()}_${form.portada.name}`);
    }
    await publicarArticuloBlog({
      titulo: form.titulo.trim(),
      resumen: form.resumen.trim(),
      contenido: form.contenido.trim(),
      autor: form.autor.trim(),
      categoria: form.categoria,
      tags: form.tags.split(",").map(t => t.trim()).filter(Boolean),
      urlPortada,
      fecha: new Date().toISOString(),
      estado: "publicado"
    });
    setSubiendo(false);
    setForm({
      titulo: "",
      resumen: "",
      contenido: "",
      autor: "",
      categoria: CATEGORIAS[0],
      tags: "",
      portada: null
    });
    setPreview("");
    toast.success("¡Artículo publicado!");
    onPublicado && onPublicado();
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="max-w-lg mx-auto bg-white rounded-xl border-2 border-[#7a2518] shadow-md p-6 mt-6 flex flex-col gap-4"
      style={{ minWidth: 320 }}
    >
      <h2 className="text-2xl font-bold text-[#7a2518] mb-2 text-center">Publicar artículo</h2>
      <label className="block font-semibold text-[#3e2723]">
        Título*:
        <input name="titulo" value={form.titulo} onChange={handleChange} required
          className="w-full border rounded p-2 mt-1" maxLength={110} />
      </label>

      <label className="block font-semibold text-[#3e2723]">
        Autor*:
        <input name="autor" value={form.autor} onChange={handleChange} required
          className="w-full border rounded p-2 mt-1" maxLength={60} />
      </label>

      <label className="block font-semibold text-[#3e2723]">
        Categoría:
        <select name="categoria" value={form.categoria} onChange={handleChange}
          className="w-full border rounded p-2 mt-1">
          {CATEGORIAS.map(cat => <option key={cat}>{cat}</option>)}
        </select>
      </label>

      <label className="block font-semibold text-[#3e2723]">
        Resumen*:
        <textarea name="resumen" value={form.resumen} onChange={handleChange} required
          className="w-full border rounded p-2 mt-1 min-h-[64px]" maxLength={250}
          placeholder="Escribe un resumen atractivo para el lector..." />
        <span className="block text-xs text-gray-500">{form.resumen.length}/250</span>
      </label>

      <label className="block font-semibold text-[#3e2723]">
        Contenido*:
        <textarea name="contenido" value={form.contenido} onChange={handleChange} required
          className="w-full border rounded p-2 mt-1 min-h-[150px]"
          placeholder="Texto principal, usa salto de línea para separar párrafos" />
      </label>

      <label className="block font-semibold text-[#3e2723]">
        Palabras clave (tags, separadas por coma):
        <input name="tags" value={form.tags} onChange={handleChange}
          className="w-full border rounded p-2 mt-1" placeholder="ej: civil, penal, procesal, IA" />
      </label>

      <label className="block font-semibold text-[#3e2723]">
        Portada (opcional):
        <input type="file" accept="image/*" name="portada" onChange={handleChange}
          className="w-full mt-1" />
        {preview &&
          <img src={preview} alt="portada" className="w-48 mx-auto mt-2 rounded-xl shadow border" />
        }
      </label>

      <button type="submit"
        className={`w-full py-2 rounded-xl font-bold text-white bg-[#7a2518] hover:bg-[#3e2723] transition-colors text-lg mt-2`}
        disabled={!valid || subiendo}
      >
        {subiendo ? "Publicando..." : "Publicar"}
      </button>
    </form>
  );
}
