import React, { useState } from "react";

export default function HerramientaAgenda() {
  const [evento, setEvento] = useState("");
  const [fecha, setFecha] = useState("");
  const [agenda, setAgenda] = useState([]);

  function agregarEvento() {
    if (!evento || !fecha) return;
    setAgenda(a => [...a, { evento, fecha }]);
    setEvento(""); setFecha("");
  }

  return (
    <div className="py-2 flex flex-col gap-3">
      <label className="font-bold">Nuevo evento o audiencia:</label>
      <input type="text" className="border rounded p-1" placeholder="Descripción del evento" value={evento} onChange={e => setEvento(e.target.value)} />
      <input type="date" className="border rounded p-1" value={fecha} onChange={e => setFecha(e.target.value)} />
      <button className="px-4 py-2 bg-green-700 text-white rounded" onClick={agregarEvento} disabled={!evento || !fecha}>Agregar a agenda</button>
      <ul className="mt-2">
        {agenda.map((e, idx) => (
          <li key={idx} className="text-sm">📅 <b>{e.evento}</b> para el {e.fecha}</li>
        ))}
      </ul>
    </div>
  );
}
