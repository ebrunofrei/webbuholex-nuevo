import React, { useState } from "react";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "../services/firebaseConfig";
import { X } from "lucide-react";

const materias = [
  "Civil", "Penal", "Laboral", "Administrativo", "Familia", "Constitucional", "Otro"
];

export default function ModalNuevoExpediente({ onClose, onCreated }) {
  const [form, setForm] = useState({
    numero: "",
    año: new Date().getFullYear(),
    cliente: "",
    materia: "Civil",
    juzgado: "",
    responsable: "",
    estado: "Activo"
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = e =>
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async e => {
    e.preventDefault();
    setError("");
    if (!form.numero || !form.cliente || !form.juzgado || !form.responsable) {
      setError("Completa todos los campos obligatorios.");
      return;
    }
    setLoading(true);
    try {
      await addDoc(collection(db, "expedientes"), {
        ...form,
        creadoEn: serverTimestamp()
      });
      setLoading(false);
      onClose();
      if (onCreated) onCreated();
    } catch (err) {
      setError("Error al crear expediente. Intenta de nuevo.");
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center">
      <div className="bg-white rounded-2xl p-8 w-[95vw] max-w-xl shadow-2xl relative animate-fade-in-up">
        <button
          className="absolute right-3 top-3 p-1 rounded hover:bg-gray-100 text-gray-400"
          onClick={onClose}
        >
          <X size={24} />
        </button>
        <h2 className="text-xl font-bold mb-4 text-[#b03a1a]">Nuevo Expediente</h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="block text-sm font-semibold mb-1">
                Número <span className="text-red-500">*</span>
              </label>
              <input
                name="numero"
                type="text"
                className="border px-3 py-2 rounded w-full"
                value={form.numero}
                onChange={handleChange}
                placeholder="Ej: 001-2025"
                required
              />
            </div>
            <div className="w-32">
              <label className="block text-sm font-semibold mb-1">Año</label>
              <input
                name="año"
                type="number"
                className="border px-3 py-2 rounded w-full"
                value={form.año}
                onChange={handleChange}
                min={2000}
                max={2100}
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">
              Cliente/Parte <span className="text-red-500">*</span>
            </label>
            <input
              name="cliente"
              type="text"
              className="border px-3 py-2 rounded w-full"
              value={form.cliente}
              onChange={handleChange}
              placeholder="Nombre del cliente"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Materia</label>
            <select
              name="materia"
              className="border px-3 py-2 rounded w-full"
              value={form.materia}
              onChange={handleChange}
            >
              {materias.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">
              Juzgado/Sala <span className="text-red-500">*</span>
            </label>
            <input
              name="juzgado"
              type="text"
              className="border px-3 py-2 rounded w-full"
              value={form.juzgado}
              onChange={handleChange}
              placeholder="Ej: Segundo Juzgado Civil"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">
              Responsable <span className="text-red-500">*</span>
            </label>
            <input
              name="responsable"
              type="text"
              className="border px-3 py-2 rounded w-full"
              value={form.responsable}
              onChange={handleChange}
              placeholder="Abogado o user responsable"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Estado</label>
            <select
              name="estado"
              className="border px-3 py-2 rounded w-full"
              value={form.estado}
              onChange={handleChange}
            >
              <option>Activo</option>
              <option>Pendiente</option>
              <option>Archivado</option>
            </select>
          </div>
          {error && <div className="text-red-600 text-sm">{error}</div>}
          <button
            className="bg-[#a52e00] hover:bg-[#b03a1a] text-white px-6 py-2 rounded-full font-bold mt-2 disabled:opacity-60"
            disabled={loading}
            type="submit"
          >
            {loading ? "Creando..." : "Crear expediente"}
          </button>
        </form>
      </div>
    </div>
  );
}
