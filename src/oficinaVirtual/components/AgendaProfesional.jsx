import React, { useEffect, useState, useMemo } from "react";
import { Calendar, dateFnsLocalizer } from "react-big-calendar";
import format from "date-fns/format";
import parse from "date-fns/parse";
import startOfWeek from "date-fns/startOfWeek";
import getDay from "date-fns/getDay";
import es from "date-fns/locale/es";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { getFirestore, collection, query, where, getDocs, addDoc } from "firebase/firestore";
import { useAuth } from "@/context/AuthContext"; // Ajusta según tu estructura

const locales = { es };
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

const db = getFirestore();

// Enviar WhatsApp automático usando backend (Twilio)
async function enviarWhatsAppAutomatica(numero, mensaje) {
  // Se asume que el backend expone /api/send-whatsapp (Express o Vercel Serverless)
  const numeroFinal = numero.startsWith("+") ? numero : "+" + numero;
  const res = await fetch("/api/send-whatsapp", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      to: numeroFinal,
      body: mensaje,
    }),
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || "Error enviando WhatsApp");
  }
  return true;
}

export default function AgendaProfesional() {
  const { user } = useAuth();
  const [eventos, setEventos] = useState([]);
  const [modal, setModal] = useState(false);
  const [nuevoEvento, setNuevoEvento] = useState({
    title: "",
    start: "",
    end: "",
    description: "",
    telefono: "",
    alertaWhatsapp: false,
  });
  const [loading, setLoading] = useState(false);

  // Traer eventos del usuario
  useEffect(() => {
    if (!user) return;
    const obtenerEventos = async () => {
      const q = query(collection(db, "agendaEventos"), where("usuarioId", "==", user.uid));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id,
        start: new Date(doc.data().start),
        end: new Date(doc.data().end),
      }));
      setEventos(data);
    };
    obtenerEventos();
  }, [user, modal]);

  // Manejo de formulario
  const handleChange = e => {
    const { name, value, type, checked } = e.target;
    setNuevoEvento(prev => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  // Guardar evento en Firestore y enviar WhatsApp si corresponde
  const handleGuardar = async () => {
    if (!nuevoEvento.title || !nuevoEvento.start || !nuevoEvento.end) {
      alert("Completa todos los campos requeridos");
      return;
    }
    setLoading(true);
    try {
      await addDoc(collection(db, "agendaEventos"), {
        ...nuevoEvento,
        usuarioId: user.uid,
        creadoEn: new Date(),
        actualizadoEn: new Date(),
      });

      // Envío automático WhatsApp (backend)
      if (nuevoEvento.alertaWhatsapp && nuevoEvento.telefono) {
        try {
          await enviarWhatsAppAutomatica(
            nuevoEvento.telefono,
            `Recordatorio: "${nuevoEvento.title}" el ${format(new Date(nuevoEvento.start), "dd/MM/yyyy HH:mm")}\n\n${nuevoEvento.description || ""}`
          );
          alert("Alerta enviada automáticamente por WhatsApp");
        } catch (error) {
          alert("No se pudo enviar la alerta por WhatsApp: " + error.message);
        }
      }

      setModal(false);
      setNuevoEvento({
        title: "",
        start: "",
        end: "",
        description: "",
        telefono: "",
        alertaWhatsapp: false,
      });
    } finally {
      setLoading(false);
    }
  };

  // Para rango de fecha y hora en formulario
  const hoy = useMemo(() => format(new Date(), "yyyy-MM-dd'T'HH:mm"), []);

  return (
    <div className="container mx-auto p-4 max-w-6xl">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-3">
        <h2 className="text-2xl font-bold">Agenda Jurídica BúhoLex</h2>
        <button
          className="bg-[#a52e00] text-white px-4 py-2 rounded shadow hover:bg-[#822200] transition"
          onClick={() => setModal(true)}
        >
          + Nuevo evento
        </button>
      </div>

      <div className="bg-white rounded shadow overflow-auto" style={{ minHeight: 480 }}>
        <Calendar
          localizer={localizer}
          events={eventos}
          startAccessor="start"
          endAccessor="end"
          style={{ height: 600, minWidth: 320 }}
          messages={{
            next: "Sig.",
            previous: "Ant.",
            today: "Hoy",
            month: "Mes",
            week: "Semana",
            day: "Día",
            agenda: "Agenda",
          }}
          popup
        />
      </div>

      {/* MODAL */}
      {modal && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-40 flex items-center justify-center p-2">
          <div className="bg-white p-4 rounded-2xl shadow-2xl w-full max-w-md relative">
            <button
              onClick={() => setModal(false)}
              className="absolute top-2 right-4 text-xl text-gray-600 hover:text-black"
              aria-label="Cerrar"
            >×</button>
            <h3 className="text-xl font-bold mb-2">Nuevo evento</h3>
            <input
              name="title"
              placeholder="Título*"
              className="border rounded p-2 w-full mb-2"
              value={nuevoEvento.title}
              onChange={handleChange}
              required
              autoFocus
            />
            <textarea
              name="description"
              placeholder="Descripción"
              className="border rounded p-2 w-full mb-2"
              value={nuevoEvento.description}
              onChange={handleChange}
            />
            <div className="flex gap-2 mb-2 flex-col sm:flex-row">
              <div className="flex-1">
                <label className="block text-xs text-gray-700">Inicio*</label>
                <input
                  name="start"
                  type="datetime-local"
                  className="border rounded p-2 w-full"
                  min={hoy}
                  value={nuevoEvento.start}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs text-gray-700">Fin*</label>
                <input
                  name="end"
                  type="datetime-local"
                  className="border rounded p-2 w-full"
                  min={nuevoEvento.start || hoy}
                  value={nuevoEvento.end}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <input
                name="alertaWhatsapp"
                type="checkbox"
                checked={nuevoEvento.alertaWhatsapp}
                onChange={handleChange}
                id="alertaWhatsapp"
              />
              <label htmlFor="alertaWhatsapp" className="text-sm cursor-pointer">
                Enviar alerta por WhatsApp
              </label>
              <input
                name="telefono"
                placeholder="51999999999"
                className="border rounded p-2 flex-1"
                value={nuevoEvento.telefono}
                onChange={handleChange}
                disabled={!nuevoEvento.alertaWhatsapp}
                type="tel"
                pattern="^(\+?51)?9\d{8}$"
                title="Debe ser número peruano válido, ejemplo: 51999999999"
              />
            </div>
            <button
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded w-full mt-2 font-semibold"
              onClick={handleGuardar}
              disabled={loading}
            >
              {loading ? "Guardando..." : "Guardar evento"}
            </button>
            <p className="text-xs text-gray-400 mt-2">
              *Campos obligatorios. El mensaje WhatsApp solo se envía si el teléfono es válido y la casilla está activada.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
