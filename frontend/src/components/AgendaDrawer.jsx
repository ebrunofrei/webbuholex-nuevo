import React, { useState } from "react";

// Dummy para almacenar/agendar plazos (puedes integrar con Firebase)
export default function AgendaDrawer({ visible, onClose }) {
  const [eventos, setEventos] = useState([]);
  const [titulo, setTitulo] = useState("");
  const [fecha, setFecha] = useState("");

  function handleAgregar() {
    if (!titulo || !fecha) return;
    setEventos(prev => [...prev, { titulo, fecha }]);
    setTitulo(""); setFecha("");
  }

  return (
    <div className={`fixed top-0 right-0 h-full w-[350px] bg-white shadow-lg z-40 transition-transform duration-300 ${visible ? "translate-x-0" : "translate-x-full"}`}>
      <div className="flex justify-between items-center px-4 py-3 border-b">
        <div className="font-bold text-lg text-[#b03a1a]">Agenda / Recordatorios</div>
        <button onClick={onClose} className="text-2xl text-gray-400 hover:text-red-600">&times;</button>
      </div>
      <div className="p-4">
        <input className="w-full border p-2 rounded mb-2" placeholder="Título" value={titulo} onChange={e => setTitulo(e.target.value)} />
        <input className="w-full border p-2 rounded mb-2" type="date" value={fecha} onChange={e => setFecha(e.target.value)} />
        <button className="bg-[#b03a1a] text-white px-4 py-1 rounded" onClick={handleAgregar}>Agregar</button>
        <div className="mt-4">
          {eventos.length === 0 && <div className="text-gray-400">No hay eventos.</div>}
          {eventos.map((ev, i) => (
            <div key={i} className="p-2 border rounded mt-2">
              <span className="font-bold">{ev.titulo}</span>
              <span className="block text-sm text-gray-500">{ev.fecha}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
