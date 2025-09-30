import React, { useState, useRef } from "react";
import {
  publicarArticuloBlog,
  editarArticuloBlog,
  subirPortadaBlog,
} from "@services/firebaseBlogService";
import { useToast } from "@components/ui/use-toast";

export default function BlogPublicarEditarModal({ articulo, onClose, onSave }) {
  const { toast } = useToast();

  // Si es edición, precarga datos
  const [form, setForm] = useState({
    titulo: articulo?.titulo || "",
    resumen: articulo?.resumen || "",
    contenido: articulo?.contenido || "",
    autor: articulo?.autor || "",
    categoria: articulo?.categoria || "",
    tags: articulo?.tags ? articulo.tags.join(", ") : "",
    urlPortada: articulo?.urlPortada || "",
  });
  const [subiendo, setSubiendo] = useState(false);
  const portadaInputRef = useRef();

  // Cambios en campos
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  // Guardar cambios
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubiendo(true);

    try {
      let urlPortada = form.urlPortada;
      if (portadaInputRef.current?.files[0]) {
        urlPortada = await subirPortadaBlog(
          portadaInputRef.current.files[0],
          `blog/portadas/${Date.now()}_${portadaInputRef.current.files[0].name}`
        );
      }
      const data = {
        titulo: form.titulo.trim(),
        resumen: form.resumen.trim(),
        contenido: form.contenido.trim(),
        autor: form.autor.trim(),
        categoria: form.categoria.trim(),
        tags: form.tags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),
        urlPortada,
      };
      if (articulo?.id) {
        await editarArticuloBlog(articulo.id, data);
        toast({
          title: "Éxito",
          description: "Artículo actualizado correctamente",
        });
      } else {
        await publicarArticuloBlog(data);
        toast({
          title: "Éxito",
          description: "Artículo publicado correctamente",
        });
      }
      onSave && onSave();
      onClose();
    } catch (err) {
      toast({
        title: "Error",
        description: "No fue posible guardar el artículo",
      });
    } finally {
      setSubiendo(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-40 p-2 sm:p-4">
      <form
        className="bg-white rounded-xl w-full max-w-sm sm:max-w-lg p-4 sm:p-6 shadow-lg relative"
        onSubmit={handleSubmit}
      >
        {/* Botón cerrar */}
        <button
          type="button"
          className="absolute right-4 top-4 text-xl text-gray-600 hover:text-red-500"
          onClick={onClose}
        >
          ✕
        </button>

        <h2 className="text-lg sm:text-xl font-bold mb-4 text-[#7a2518] text-center">
          {articulo?.id ? "Editar artículo" : "Nuevo artículo"}
        </h2>

        <input
          name="titulo"
          value={form.titulo}
          onChange={handleChange}
          placeholder="Título"
          required
          className="w-full mb-2 border rounded p-2"
        />
        <input
          name="autor"
          value={form.autor}
          onChange={handleChange}
          placeholder="Autor"
          required
          className="w-full mb-2 border rounded p-2"
        />
        <input
          name="categoria"
          value={form.categoria}
          onChange={handleChange}
          placeholder="Categoría"
          required
          className="w-full mb-2 border rounded p-2"
        />
        <input
          name="tags"
          value={form.tags}
          onChange={handleChange}
          placeholder="Palabras clave (separadas por coma)"
          className="w-full mb-2 border rounded p-2"
        />
        <textarea
          name="resumen"
          value={form.resumen}
          onChange={handleChange}
          placeholder="Resumen largo"
          required
          className="w-full mb-2 border rounded p-2 min-h-[70px]"
        />
        <textarea
          name="contenido"
          value={form.contenido}
          onChange={handleChange}
          placeholder="Contenido completo"
          required
          className="w-full mb-2 border rounded p-2 min-h-[120px]"
        />
        <input
          type="file"
          accept="image/*"
          ref={portadaInputRef}
          className="w-full mb-2"
        />
        <button
          type="submit"
          disabled={subiendo}
          className="w-full bg-[#7a2518] text-white font-bold py-2 rounded mt-2 hover:bg-[#3e2723] transition-colors"
        >
          {subiendo
            ? "Guardando..."
            : articulo?.id
            ? "Actualizar"
            : "Publicar"}
        </button>
      </form>
    </div>
  );
}
