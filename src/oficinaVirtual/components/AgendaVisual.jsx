import React, { useEffect, useState } from "react";
import { Calendar, momentLocalizer } from "react-big-calendar";
import "react-big-calendar/lib/css/react-big-calendar.css";
import moment from "moment";
import { obtenerEventosUsuario, obtenerEventosExpediente } from "@/services/agendadorService";

const localizer = momentLocalizer(moment);

export default function AgendaVisual({ user, expedienteId }) {
  const [eventos, setEventos] = useState([]);

  useEffect(() => {
    async function cargarEventos() {
      if (expedienteId) {
        setEventos(await obtenerEventosExpediente(expedienteId));
      } else if (user) {
        setEventos(await obtenerEventosUsuario(user.id));
      }
    }
    cargarEventos();
  }, [user, expedienteId]);

  return (
    <div className="p-3 bg-white rounded-xl shadow-lg min-h-[450px]">
      <h2 className="text-xl font-bold mb-3 text-[#a52a2a]">
        {expedienteId ? "Agenda del Expediente" : "Agenda Personal"}
      </h2>
      <Calendar
        localizer={localizer}
        events={eventos}
        startAccessor="start"
        endAccessor="end"
        style={{ height: 450 }}
        messages={{
          next: "Sig",
          previous: "Ant",
          today: "Hoy",
          month: "Mes",
          week: "Semana",
          day: "Día",
          agenda: "Agenda",
        }}
      />
    </div>
  );
}
