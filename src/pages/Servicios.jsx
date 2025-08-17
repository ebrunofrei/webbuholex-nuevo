import React, { useState } from "react";
import { motion } from "framer-motion";
import Button from "../components/ui/Button";
import emailjs from "@emailjs/browser";

const SERVICIO_EMAILJS = "service_ng0t1kf";
const TEMPLATE_EMAILJS = "template_946pw4z";
const PUBLIC_KEY_EMAILJS = "HqOZV84JFcrmk4snj";
const whatsappNumber = "922038280";
const messengerUrl = "https://www.facebook.com/share/1HrTtaEEC6/";

export default function Servicios() {
  // Estados para el formulario
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [consulta, setConsulta] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSending(true);
    setSent(false);
    setError("");

    if (!nombre || !email || !consulta) {
      setError("Por favor completa todos los campos obligatorios.");
      setSending(false);
      return;
    }

    const templateParams = {
      name: nombre,
      email: email,
      message: consulta,
      title: "Consulta Legal",
    };

    try {
      await emailjs.send(
        SERVICIO_EMAILJS,
        TEMPLATE_EMAILJS,
        templateParams,
        PUBLIC_KEY_EMAILJS
      );
      setSent(true);
      setNombre("");
      setEmail("");
      setConsulta("");
      setError("");
    } catch (err) {
      setError("No se pudo enviar la consulta. Intenta de nuevo.");
      setSent(false);
      console.log('EmailJS Error:', err);
    }
    setSending(false);
  };

  return (
    <section className="px-4 py-12 max-w-5xl mx-auto">
      <motion.h1
        className="text-3xl font-bold text-center mb-10"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        Servicios Jurídicos Profesionales
      </motion.h1>

      <div className="grid gap-8 md:grid-cols-2">
        <motion.div
          className="bg-white shadow-lg rounded-2xl p-6 border"
          whileHover={{ scale: 1.03 }}
        >
          <h2 className="text-xl font-semibold mb-2">Patrocinio Legal</h2>
          <p className="text-gray-700">
            Representación técnica en procesos judiciales y administrativos, con defensa activa en todas las etapas del proceso. Elaboración de demandas, denuncias, escritos y recursos de impugnación con estilo argumentativo y profesional.
          </p>
        </motion.div>
        <motion.div
          className="bg-white shadow-lg rounded-2xl p-6 border"
          whileHover={{ scale: 1.03 }}
        >
          <h2 className="text-xl font-semibold mb-2">Asesoría Legal</h2>
          <p className="text-gray-700">
            Consultas y orientación especializada en Derecho civil, penal, administrativo, laboral y constitucional. Te ayudamos a prevenir contingencias legales antes de que ocurran.
          </p>
        </motion.div>
        <motion.div
          className="bg-white shadow-lg rounded-2xl p-6 border"
          whileHover={{ scale: 1.03 }}
        >
          <h2 className="text-xl font-semibold mb-2">Defensa Judicial</h2>
          <p className="text-gray-700">
            Defensa técnica en procesos penales, civiles, contencioso-administrativos y más. Elaboración de estrategias de defensa sólidas y recursos legales a tu medida.
          </p>
        </motion.div>
        <motion.div
          className="bg-white shadow-lg rounded-2xl p-6 border"
          whileHover={{ scale: 1.03 }}
        >
          <h2 className="text-xl font-semibold mb-2">Videoconferencia Personalizada</h2>
          <p className="text-gray-700 mb-4">
            Programa una videollamada con nuestro equipo para recibir asesoría legal directa, en tiempo real, desde la comodidad de tu hogar.
          </p>
          <Button onClick={() => window.open("https://calendly.com/", "_blank")}>
            Agendar videollamada
          </Button>
        </motion.div>
      </div>

      {/* Contacto rápido */}
      <div className="flex flex-wrap items-center gap-3 mt-10 mb-4">
        <a
          href={`https://wa.me/51${whatsappNumber}`}
          className="bg-green-100 rounded-lg px-3 py-1 flex items-center gap-2 text-green-800"
          target="_blank" rel="noopener noreferrer"
        >
          <span className="h-3 w-3 bg-green-400 rounded-full inline-block" /> WhatsApp Abogado
        </a>
        <a
          href={messengerUrl}
          className="bg-blue-100 rounded-lg px-3 py-1 flex items-center gap-2 text-blue-800"
          target="_blank" rel="noopener noreferrer"
        >
          <span className="h-3 w-3 bg-blue-300 rounded-full inline-block" /> Messenger Abogado
        </a>
      </div>

      {/* Formulario de consulta */}
      <div className="grid md:grid-cols-2 gap-6">
        <form
          id="form-consulta"
          onSubmit={handleSubmit}
          className="bg-white rounded-xl shadow p-6 flex flex-col gap-3"
        >
          <h3 className="font-semibold mb-2 text-sm">Haz tu consulta aquí</h3>
          <input
            className="border rounded px-3 py-2"
            type="text"
            placeholder="Nombre completo"
            value={nombre}
            onChange={e => setNombre(e.target.value)}
            required
          />
          <input
            className="border rounded px-3 py-2"
            type="email"
            placeholder="Correo electrónico"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
          />
          <textarea
            className="border rounded px-3 py-2"
            placeholder="Describe tu caso o consulta legal..."
            value={consulta}
            onChange={e => setConsulta(e.target.value)}
            rows={3}
            required
          />
          <span className="text-xs text-gray-500">
            *Si necesitas enviar archivos, indícalo en la consulta y te contactaremos.
          </span>
          {error && (
            <div className="text-red-600 mb-2">{error}</div>
          )}
          {sent && (
            <div className="text-green-600 mb-2">
              ¡Consulta enviada correctamente!
            </div>
          )}
          <Button type="submit" disabled={sending}>
            {sending ? "Enviando..." : "Enviar consulta"}
          </Button>
        </form>

        {/* Pagos */}
        <div className="bg-white rounded-xl shadow p-6">
          <h3 className="font-semibold mb-4 text-center">Paga tu consulta legal online</h3>
          <div className="flex gap-6 mb-4 justify-center">
            <div className="flex flex-col items-center">
              <img src="/img/qr-yape.png" alt="QR Yape" width={120} />
              <span className="text-xs mt-1 text-center">
                Eduardo Frei Bruno Gomez<br />
                Yape: 922038280
              </span>
            </div>
            <div className="flex flex-col items-center">
              <img src="/img/qr-bbva.png" alt="QR BBVA" width={120} />
              <span className="text-xs mt-1 text-center">
                Empresa Constructora Consultora Bienes<br />
                BBVA<br />
                Acepta billeteras digitales
              </span>
            </div>
          </div>
          <p className="text-xs text-gray-500 text-center">
            Escanea el QR, realiza tu pago y completa el formulario.<br />
            Tu consulta será atendida tras la validación del pago.
          </p>
        </div>
      </div>
    </section>
  );
}
