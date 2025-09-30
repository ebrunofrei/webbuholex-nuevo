// src/pages/Servicios.jsx
import React from "react";
import { Link } from "react-router-dom";
import {
  CATEGORIES,
  WA,
  CTA_WHATSAPP,
} from "@services/servicesApi";
import ServiceCard from "@components/services/ServiceCard";
import Gallery from "@components/services/Gallery";
import VideoEmbed from "@components/services/VideoEmbed";

// Banners de marketing desde /public/marketing
const MARKETING_IMAGES = [
  "/marketing/bannerservicios1.jpg",
  "/marketing/tesis-banner.webp",
];

export default function Servicios() {
  return (
    <section className="px-4 py-10 max-w-6xl mx-auto">
      {/* Título */}
      <h1 className="text-3xl font-extrabold text-center mb-8 text-[#5C2E0B]">
        Servicios Jurídicos Profesionales
      </h1>

      {/* Bloques iniciales (tus 4 tarjetas) */}
      <div className="grid gap-6 md:grid-cols-2 mb-6">
        <div className="bg-white border rounded-2xl p-5 shadow-sm">
          <h2 className="font-semibold text-lg mb-1 text-[#5C2E0B]">Patrocinio Legal</h2>
          <p className="text-gray-700 text-sm">
            Representación técnica en procesos judiciales y administrativos.
            Demandas, denuncias, escritos y recursos con argumentación sólida.
          </p>
        </div>
        <div className="bg-white border rounded-2xl p-5 shadow-sm">
          <h2 className="font-semibold text-lg mb-1 text-[#5C2E0B]">Asesoría Legal</h2>
          <p className="text-gray-700 text-sm">
            Consultas en civil, penal, administrativo, laboral y constitucional.
            Prevención de contingencias con guía práctica.
          </p>
        </div>
        <div className="bg-white border rounded-2xl p-5 shadow-sm">
          <h2 className="font-semibold text-lg mb-1 text-[#5C2E0B]">Defensa Judicial</h2>
          <p className="text-gray-700 text-sm">
            Estrategia procesal según tu caso y escritos de alta calidad.
          </p>
        </div>
        <div className="bg-white border rounded-2xl p-5 shadow-sm">
          <h2 className="font-semibold text-lg mb-1 text-[#5C2E0B]">
            Videoconferencia Personalizada
          </h2>
          <p className="text-gray-700 text-sm mb-3">
            Agenda una videollamada y recibe asesoría directa desde donde estés.
          </p>
          <a
            href="https://calendly.com/"
            target="_blank"
            rel="noreferrer"
            className="inline-block px-4 py-2 rounded-xl bg-amber-600 text-white text-sm hover:bg-amber-700"
          >
            Agendar videollamada
          </a>
        </div>
      </div>

      {/* Chips contacto */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <a
          href={CTA_WHATSAPP("Hola, quisiera hacer una consulta legal.")}
          className="bg-green-100 rounded-lg px-3 py-1 text-green-800 text-sm"
          target="_blank" rel="noreferrer"
        >
          WhatsApp Abogado
        </a>
        <a
          href="https://www.facebook.com/share/1HrTtaEEC6/"
          className="bg-blue-100 rounded-lg px-3 py-1 text-blue-800 text-sm"
          target="_blank" rel="noreferrer"
        >
          Messenger Abogado
        </a>
        <span className="text-sm text-gray-600">Llamar: +{WA}</span>
      </div>

      {/* Banners/Galería marketing */}
      <div className="mb-6">
        <Gallery images={MARKETING_IMAGES} />
      </div>

      {/* Grid por categorías (hasta 3 ítems c/u) */}
      <div className="space-y-8">
        {CATEGORIES.map((cat) => (
          <div key={cat.slug} className="bg-white/50 p-4 rounded-2xl border">
            <div className="mb-3 flex items-baseline gap-2">
              <span className="text-xl">{cat.icon}</span>
              <h2 className="text-xl font-semibold text-[#5C2E0B]">{cat.title}</h2>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {(cat.items || []).slice(0, 3).map((s) => (
                <ServiceCard key={s.slug} s={s} />
              ))}
            </div>

            {(cat.items?.length || 0) > 3 && (
              <div className="mt-3">
                <Link
                  to={`/servicios/${cat.items[3].slug}`}
                  className="text-sm underline text-[#5C2E0B]"
                >
                  Ver más…
                </Link>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Panel pago con QRs */}
      <div className="grid md:grid-cols-2 gap-6 mt-10">
        {/* Form simple (texto) */}
        <div className="bg-white rounded-xl shadow p-6">
          <h3 className="font-semibold mb-4">Haz tu consulta aquí</h3>
          <p className="text-sm text-gray-600 mb-2">
            Rellena el formulario en <Link className="underline" to="/litisbot">el chat</Link>
            {" "}o escríbenos por WhatsApp. *Si necesitas enviar archivos, indícalo en el mensaje.
          </p>
          <div className="flex gap-2 pt-2">
            <a
              href={CTA_WHATSAPP("Hola, quiero una consulta legal.")}
              target="_blank"
              rel="noreferrer"
              className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm hover:bg-emerald-700"
            >
              Consultar por WhatsApp
            </a>
            <Link
              to="/chat-test"
              className="px-4 py-2 rounded-xl bg-amber-600 text-white text-sm hover:bg-amber-700"
            >
              Consulta por chat
            </Link>
          </div>
        </div>

        {/* QRs */}
        <div className="bg-white rounded-xl shadow p-6">
          <h3 className="font-semibold mb-4 text-center">Paga tu consulta legal online</h3>
          <div className="flex gap-6 mb-4 justify-center">
            <div className="flex flex-col items-center">
              <img src="/img/qr-yape.png" alt="QR Yape" width={130} height={130} />
              <span className="text-xs mt-1 text-center">
                Eduardo Frei Bruno Gomez<br/>Yape: 922 038 280
              </span>
            </div>
            <div className="flex flex-col items-center">
              <img src="/img/qr-bbva.png" alt="QR BBVA" width={130} height={130} />
              <span className="text-xs mt-1 text-center">
                Empresa Constructora Consultora Bienes <br/>BBVA – Billeteras digitales
              </span>
            </div>
          </div>
          <p className="text-xs text-gray-500 text-center">
            Escanea el QR, realiza tu pago y envíanos el voucher por WhatsApp.<br/>
            Tu consulta será atendida tras la validación del pago.
          </p>
        </div>
      </div>
    </section>
  );
}
