import React, { useState, useEffect } from "react";

export default function EditarLibroModal({ libro, onSave, onClose, cargando }) {
  const [form, setForm] = useState({
    titulo: "",
    autor: "",
    materia: "",
    descripcion: "",
  });

  useEffect(() => {
    if (libro) {
      setForm({
        titulo: libro.titulo || "",
        autor: libro.autor || "",
        materia: libro.materia || "",
        descripcion: libro.descripcion || "",
      });
    }
  }, [libro]);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    onSave(form);
  }

  if (!libro) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-30 flex items-center justify-center">
      <div className="bg-white rounded-xl p-6 shadow-lg w-full max-w-md border-2 border-[#7a2518]">
        <h2 className="text-xl font-bold text-[#7a2518] mb-3">Editar libro</h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-2">
          <input type="text" name="titulo" required placeholder="Título" value={form.titulo} className="p-2 rounded border border-[#7a2518]" onChange={handleChange} />
          <input type="text" name="autor" required placeholder="Autor" value={form.autor} className="p-2 rounded border border-[#7a2518]" onChange={handleChange} />
          <input type="text" name="materia" required placeholder="Materia" value={form.materia} className="p-2 rounded border border-[#7a2518]" onChange={handleChange} />
          <textarea name="descripcion" required placeholder="Descripción breve" value={form.descripcion} className="p-2 rounded border border-[#7a2518]" onChange={handleChange} />
          <div className="flex justify-end gap-2 mt-3">
            <button type="button" className="px-4 py-2 rounded bg-gray-200 text-gray-800" onClick={onClose} disabled={cargando}>Cancelar</button>
            <button type="submit" className="px-4 py-2 rounded bg-[#7a2518] text-white font-bold" disabled={cargando}>
              {cargando ? "Guardando..." : "Guardar cambios"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
