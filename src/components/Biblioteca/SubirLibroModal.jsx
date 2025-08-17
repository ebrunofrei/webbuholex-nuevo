import React, { useState } from "react";

export default function SubirLibroModal({ onSave, onClose, cargando }) {
  const [form, setForm] = useState({
    titulo: "",
    autor: "",
    materia: "",
    descripcion: "",
    archivo: null,
    portada: null,
    urlDrive: "",
    anio: "",
  });

  function handleChange(e) {
    const { name, value, files } = e.target;
    if (files) {
      setForm(prev => ({ ...prev, [name]: files[0] }));
    } else {
      setForm(prev => ({ ...prev, [name]: value }));
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    onSave(form);
  }

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-30 flex items-center justify-center">
      <div className="bg-white rounded-xl p-6 shadow-lg w-full max-w-md border-2 border-[#7a2518]">
        <h2 className="text-xl font-bold text-[#7a2518] mb-3">Subir nuevo libro digital</h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-2">
          <input type="text" name="titulo" required placeholder="Título" className="p-2 rounded border border-[#7a2518]" onChange={handleChange} />
          <input type="text" name="autor" required placeholder="Autor" className="p-2 rounded border border-[#7a2518]" onChange={handleChange} />
          <input type="text" name="materia" required placeholder="Materia (ej: Civil, Penal...)" className="p-2 rounded border border-[#7a2518]" onChange={handleChange} />
          <textarea name="descripcion" required placeholder="Descripción breve" className="p-2 rounded border border-[#7a2518]" onChange={handleChange} />
          <input type="number" name="anio" placeholder="Año de publicación (opcional)" min={1900} max={2100} className="p-2 rounded border border-[#7a2518]" onChange={handleChange} />
          <label className="block mt-2 font-semibold text-[#3e2723]">Archivo PDF/EPUB/DOC:</label>
          <input type="file" name="archivo" accept=".pdf,.epub,.doc,.docx" required onChange={handleChange} />
          <label className="block mt-2 font-semibold text-[#3e2723]">Portada (opcional):</label>
          <input type="file" name="portada" accept="image/*" onChange={handleChange} />
          <input type="url" name="urlDrive" placeholder="Enlace Google Drive (opcional)" className="p-2 rounded border border-[#7a2518]" onChange={handleChange} />
          <div className="flex justify-end gap-2 mt-3">
            <button type="button" className="px-4 py-2 rounded bg-gray-200 text-gray-800" onClick={onClose} disabled={cargando}>Cancelar</button>
            <button type="submit" className="px-4 py-2 rounded bg-[#7a2518] text-white font-bold" disabled={cargando}>
              {cargando ? "Subiendo..." : "Publicar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
