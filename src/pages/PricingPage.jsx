import React from "react";
import { Link } from "react-router-dom";
import buholexLogo from "../assets/buho-institucional.png";

const beneficiosFree = [
  "Acceso a la Biblioteca Jurídica (con login)",
  "Consultas a LitisBot con subida de archivos (3 por día, cualquier formato)",
  "Transcripción de audio y video (1 por día)",
  "Ingreso a Oficina Virtual para organizar expedientes y casos (recursos limitados)",
  "Firmar escritos en PDF (básico)",
  "Crear tu tarjeta de presentación",
  "Ordenar/sistematizar expedientes judiciales digitales",
];

const beneficiosPro = [
  "Consultas y descargas ilimitadas",
  "Generador avanzado de modelos jurídicos",
  "Soporte de archivos: PDF, Word, audio, imagen y video",
  "Personalización de LitisBot como asistente legal",
  "Agenda y alertas personalizadas",
  "Traducción multilingüe y traducciones nativas automáticas",
  "LitisBot Audiencia para actuar como abogado/interconsulta en juicio",
  "Notificaciones y recordatorios por WhatsApp",
  "Alertas automáticas de vencimiento de plazos en la agenda",
  "Automatización de noticias jurídicas y sugerencias de aplicación según contexto",
];

const testimonios = [
  {
    nombre: "Dra. Julia Fernández",
    texto: "LitisBot agilizó mi gestión diaria y me ayudó a encontrar jurisprudencia relevante en minutos. Lo recomiendo a todo abogado moderno.",
    avatar: "https://randomuser.me/api/portraits/women/44.jpg",
    rol: "Abogada especialista en Derecho Administrativo"
  },
  {
    nombre: "Dr. Juan Pérez",
    texto: "El comparador multifuente y la generación de modelos automáticos ahorraron horas a mi estudio. La mejor inversión este año.",
    avatar: "https://randomuser.me/api/portraits/men/42.jpg",
    rol: "Socio principal, LexJurídica"
  },
];

export default function PricingPage() {
  return (
    <div className="bg-gradient-to-b from-[#b03a1a]/10 via-white to-[#b03a1a]/10 min-h-screen w-full flex flex-col">
      {/* HERO */}
      <header className="py-10 px-4 flex flex-col items-center text-center">
        <img src={buholexLogo} alt="BúhoLex" className="w-20 sm:w-28 mb-4 rounded-xl shadow bg-white" />
        <h1 className="text-3xl md:text-5xl font-extrabold text-[#b03a1a] drop-shadow mb-3 leading-tight">
          ¡Elige tu plan y potencia tu práctica legal!
        </h1>
        <p className="text-[#4b2e19] text-base md:text-xl font-medium mb-6 max-w-2xl mx-auto">
          LitisBot y BúhoLex: IA, gestión y recursos jurídicos de alto nivel para abogados, litigantes y estudiantes.
        </p>
      </header>

      {/* PLANES */}
      <section className="py-6 px-2 flex flex-col md:flex-row gap-8 justify-center items-stretch max-w-5xl mx-auto w-full">
        {/* FREE */}
        <div className="bg-white rounded-2xl shadow-lg p-6 flex-1 flex flex-col items-center border">
          <div className="text-xl font-bold text-[#b03a1a] mb-2">PLAN FREE</div>
          <div className="text-3xl font-black text-[#b03a1a] mb-3">S/. 0</div>
          <ul className="text-[#4b2e19] text-sm mb-4 space-y-2 text-left w-full max-w-xs mx-auto">
            {beneficiosFree.map((b, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-[#b03a1a] font-bold">✓</span> {b}
              </li>
            ))}
          </ul>
          <Link
            to="/registro"
            className="w-full max-w-xs bg-[#b03a1a] text-white font-bold rounded-lg px-6 py-3 mb-2 hover:bg-[#a52e00] transition"
          >
            Probar Gratis
          </Link>
          <div className="text-xs text-gray-500">* Requiere registro y login</div>
        </div>

        {/* PRO */}
        <div className="bg-white rounded-2xl shadow-lg p-6 flex-1 flex flex-col items-center border-2 border-[#b03a1a]">
          <div className="text-xl font-bold text-[#b03a1a] mb-2">PLAN PRO</div>
          <div className="text-3xl font-black text-[#b03a1a] mb-3">S/. 349 <span className="text-base font-normal">/año</span></div>
          <ul className="text-[#4b2e19] text-sm mb-4 space-y-2 text-left w-full max-w-xs mx-auto">
            {beneficiosPro.map((b, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-[#b03a1a] font-bold">★</span> {b}
              </li>
            ))}
          </ul>
          <Link
            to="/registro"
            className="w-full max-w-xs bg-[#b03a1a] text-white font-bold rounded-lg px-6 py-3 mb-2 hover:bg-[#a52e00] transition"
          >
            Suscribirme PRO
          </Link>
          <div className="text-xs text-[#b03a1a]">Incluye todos los beneficios del plan Free</div>
        </div>
      </section>

      {/* TESTIMONIOS */}
      <section className="py-10 bg-[#fff9f6]">
        <div className="max-w-4xl mx-auto px-4">
          <h3 className="text-2xl font-extrabold text-[#b03a1a] text-center mb-6">¿Qué dicen los profesionales?</h3>
          <div className="flex flex-col md:flex-row gap-6 justify-center items-stretch">
            {testimonios.map((t, i) => (
              <div key={i} className="flex-1 bg-white rounded-2xl shadow p-5 flex flex-col items-center">
                <img src={t.avatar} alt={t.nombre} className="w-16 h-16 rounded-full mb-2 shadow" />
                <div className="font-bold text-[#b03a1a] text-lg">{t.nombre}</div>
                <div className="text-[#4b2e19] text-sm italic mb-1">{t.rol}</div>
                <div className="text-[#75412e] text-sm text-center mt-1">“{t.texto}”</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="py-10 text-center">
        <h3 className="text-2xl font-extrabold text-[#b03a1a] mb-2">¿Listo para potenciar tu práctica?</h3>
        <Link
          to="/registro"
          className="inline-block bg-[#b03a1a] text-white px-10 py-4 rounded-full font-bold text-xl shadow hover:bg-[#a52e00] transition"
        >
          Comenzar ahora
        </Link>
      </section>
      {/* El Footer lo agrega el Layout principal, ¡NO lo repitas aquí! */}
    </div>
  );
}

