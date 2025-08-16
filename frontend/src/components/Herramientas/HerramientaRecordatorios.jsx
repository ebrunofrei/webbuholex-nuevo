import React, { useState } from "react";

export default function HerramientaRecordatorios() {
  const [texto, setTexto] = useState("");
  const [fecha, setFecha] = useState("");
  const [records, setRecords] = useState([]);

  function agregarRecordatorio() {
    if (!texto || !fecha) return;
    setRecords(r => [...r, { texto, fecha }]);
    setTexto(""); setFecha("");
  }

  return (
    <div className="py-2 flex flex-col gap-3">
      <label className="font-bold">Nuevo recordatorio:</label>
      <input type="text" className="border rounded p-1" placeholder="¿Qué debes recordar?" value={texto} onChange={e => setTexto(e.target.value)} />
      <input type="datetime-local" className="border rounded p-1" value={fecha} onChange={e => setFecha(e.target.value)} />
      <button className="px-4 py-2 bg-orange-600 text-white rounded" onClick={agregarRecordatorio} disabled={!texto || !fecha}>Agregar recordatorio</button>
      <ul className="mt-2">
        {records.map((r, idx) => (
          <li key={idx} className="text-sm">⏰ <b>{r.texto}</b> para {r.fecha}</li>
        ))}
      </ul>
    </div>
  );
}
