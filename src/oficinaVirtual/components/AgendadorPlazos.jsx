import React, { useState } from "react";
import {
  agregarEvento,
  agregarAGoogleCalendar,
  enviarNotificacion,
} from "@/services/agendadorService";
import { useLitisBot } from "@/context/LitisBotContext";

export default function AgendadorPlazos({ user, expedienteId, googleAccessToken, userDeviceToken }) {
  const [titulo, setTitulo] = useState("");
  const [fecha, setFecha] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [recurrencia, setRecurrencia] = useState(""); // Ej: "FREQ=WEEKLY;COUNT=5"
  const [googleSync, setGoogleSync] = useState(false);
  const [cargando, setCargando] = useState(false);
  const { analizarResolucion } = useLitisBot();

  const handleAgregar = async (e) => {
    e.preventDefault();
    setCargando(true);
    try {
      // 1. Google Calendar
      let googleEventId = null;
      if (googleSync && googleAccessToken) {
        googleEventId = await agregarAGoogleCalendar(
          {
            title: titulo,
            description: descripcion,
            start: fecha,
            end: fecha,
            recurrent: recurrencia,
          },
          googleAccessToken
        );
      }
      // 2. Guardar en Firebase
      await agregarEvento({
        userId: user.id,
        expedienteId,
        title: titulo,
        start: fecha,
        end: fecha,
        description: descripcion,
        recurrent: recurrencia,
        googleEventId,
      });
      // 3. Notificación
      if (userDeviceToken) {
        await enviarNotificacion({
          titulo: "Nuevo evento en tu agenda",
          cuerpo: `Recuerda: ${titulo} - ${descripcion}`,
          token: userDeviceToken,
        });
      }
      setTitulo("");
      setFecha("");
      setDescripcion("");
      setRecurrencia("");
      alert("¡Evento agendado con éxito!");
    } catch (err) {
      alert("Error: " + err.message);
    }
    setCargando(false);
  };

  // (Opcional) IA
  const handleAnalizarResolucion = async () => {
    const sugerencias = await analizarResolucion({ expedienteId });
    // Lógica para sugerir eventos...
  };

  return (
    <form className="bg-white rounded-xl shadow-lg p-5 flex flex-col gap-4" onSubmit={handleAgregar}>
      <h2 className="font-bold text-lg text-[#a52a2a]">Agendar evento / audiencia</h2>
      <input type="text" className="input input-bordered" placeholder="Título" value={titulo} onChange={e => setTitulo(e.target.value)} required />
      <input type="date" className="input input-bordered" value={fecha} onChange={e => setFecha(e.target.value)} required />
      <textarea className="textarea textarea-bordered" placeholder="Descripción" value={descripcion} onChange={e => setDescripcion(e.target.value)} />
      <input type="text" className="input input-bordered" placeholder='Recurrencia RRULE (ej: "FREQ=WEEKLY;COUNT=5")' value={recurrencia} onChange={e => setRecurrencia(e.target.value)} />
      <label className="flex items-center gap-2 mt-2">
        <input type="checkbox" checked={googleSync} onChange={e => setGoogleSync(e.target.checked)} />
        Sincronizar con Google Calendar
      </label>
      <button type="submit" className="btn btn-primary" disabled={cargando}>{cargando ? "Guardando..." : "Agregar"}</button>
      <button type="button" className="btn btn-outline mt-2" onClick={handleAnalizarResolucion}>Analizar resolución con IA</button>
    </form>
  );
}
