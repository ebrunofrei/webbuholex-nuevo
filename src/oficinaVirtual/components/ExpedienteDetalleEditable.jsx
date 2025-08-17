import React, { useState } from "react";

export default function ExpedienteDetalleEditable({ expediente, onUpdate }) {
  // expediente: { nombre, materia, año, nota, cliente, juzgado, especialista }
  const [editando, setEditando] = useState({});
  const [values, setValues] = useState(expediente);

  const handleChange = (campo, valor) => {
    setValues((prev) => ({ ...prev, [campo]: valor }));
    if (onUpdate) onUpdate({ ...values, [campo]: valor }); // Aquí puedes actualizar en Firestore o local
  };

  const materias = [
    "Civil", "Penal", "Laboral", "Administrativo", "Constitucional", "Familia"
  ];

  return (
    <div className="bg-white p-6 rounded-lg shadow mb-4">
      {/* Nombre editable */}
      <div className="flex items-center gap-2 mb-1">
        <span className="font-bold text-lg text-[#b03a1a]">Expediente N.º </span>
        {editando.nombre ? (
          <input
            className="border rounded p-1"
            value={values.nombre}
            onChange={e => handleChange("nombre", e.target.value)}
            onBlur={() => setEditando(e => ({ ...e, nombre: false }))}
            autoFocus
          />
        ) : (
          <span
            className="font-bold text-xl cursor-pointer"
            onDoubleClick={() => setEditando(e => ({ ...e, nombre: true }))}
            title="Doble clic para editar"
          >
            {values.nombre || <span className="italic text-gray-400">Sin nombre</span>}
          </span>
        )}
      </div>

      {/* Materia editable */}
      <div className="flex items-center gap-2 mb-1">
        <span className="font-bold">Materia:</span>
        {editando.materia ? (
          <select
            className="border rounded"
            value={values.materia}
            onChange={e => handleChange("materia", e.target.value)}
            onBlur={() => setEditando(e => ({ ...e, materia: false }))}
            autoFocus
          >
            {materias.map(m => (
              <option value={m} key={m}>{m}</option>
            ))}
          </select>
        ) : (
          <span
            className="cursor-pointer"
            onDoubleClick={() => setEditando(e => ({ ...e, materia: true }))}
            title="Doble clic para editar"
          >
            {values.materia || <span className="italic text-gray-400">Elegir materia</span>}
          </span>
        )}
      </div>

      {/* Año editable */}
      <div className="flex items-center gap-2 mb-1">
        <span className="font-bold">Año:</span>
        {editando.anio ? (
          <input
            type="number"
            className="border rounded p-1 w-20"
            value={values.anio}
            onChange={e => handleChange("anio", e.target.value)}
            onBlur={() => setEditando(e => ({ ...e, anio: false }))}
            autoFocus
          />
        ) : (
          <span
            className="cursor-pointer"
            onDoubleClick={() => setEditando(e => ({ ...e, anio: true }))}
            title="Doble clic para editar"
          >
            {values.anio || <span className="italic text-gray-400">Año</span>}
          </span>
        )}
      </div>

      {/* Cliente editable */}
      <div className="flex items-center gap-2 mb-1">
        <span className="font-bold">Cliente:</span>
        {editando.cliente ? (
          <input
            className="border rounded p-1"
            value={values.cliente}
            onChange={e => handleChange("cliente", e.target.value)}
            onBlur={() => setEditando(e => ({ ...e, cliente: false }))}
            autoFocus
          />
        ) : (
          <span
            className="cursor-pointer"
            onDoubleClick={() => setEditando(e => ({ ...e, cliente: true }))}
            title="Doble clic para editar"
          >
            {values.cliente || <span className="italic text-gray-400">Nombre del cliente</span>}
          </span>
        )}
      </div>

      {/* Juzgado editable */}
      <div className="flex items-center gap-2 mb-1">
        <span className="font-bold">Juzgado:</span>
        {editando.juzgado ? (
          <input
            className="border rounded p-1"
            value={values.juzgado}
            onChange={e => handleChange("juzgado", e.target.value)}
            onBlur={() => setEditando(e => ({ ...e, juzgado: false }))}
            autoFocus
          />
        ) : (
          <span
            className="cursor-pointer"
            onDoubleClick={() => setEditando(e => ({ ...e, juzgado: true }))}
            title="Doble clic para editar"
          >
            {values.juzgado || <span className="italic text-gray-400">Juzgado</span>}
          </span>
        )}
      </div>

      {/* Especialista editable */}
      <div className="flex items-center gap-2 mb-1">
        <span className="font-bold">Especialista:</span>
        {editando.especialista ? (
          <input
            className="border rounded p-1"
            value={values.especialista}
            onChange={e => handleChange("especialista", e.target.value)}
            onBlur={() => setEditando(e => ({ ...e, especialista: false }))}
            autoFocus
          />
        ) : (
          <span
            className="cursor-pointer"
            onDoubleClick={() => setEditando(e => ({ ...e, especialista: true }))}
            title="Doble clic para editar"
          >
            {values.especialista || <span className="italic text-gray-400">Especialista</span>}
          </span>
        )}
      </div>

      {/* Nota interna editable */}
      <div className="mt-4">
        <span className="font-bold">Nota interna:</span>
        {editando.nota ? (
          <textarea
            className="border rounded w-full mt-1 p-2"
            value={values.nota}
            rows={3}
            onChange={e => handleChange("nota", e.target.value)}
            onBlur={() => setEditando(e => ({ ...e, nota: false }))}
            autoFocus
          />
        ) : (
          <div
            className="whitespace-pre-line p-2 rounded bg-gray-50 hover:bg-yellow-50 cursor-pointer"
            onDoubleClick={() => setEditando(e => ({ ...e, nota: true }))}
            title="Doble clic para editar"
          >
            {values.nota || <span className="italic text-gray-400">Doble clic para añadir una nota interna</span>}
          </div>
        )}
      </div>
    </div>
  );
}
