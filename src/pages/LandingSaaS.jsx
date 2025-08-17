import React from "react";
import buholexLogo from "../assets/buho-institucional.png";

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

const features = [
  { title: "Búsqueda legal multifuente", desc: "Consulta al instante en legis.pe, El Peruano, SPIJ y Actualidad Legal.", icon: "📚" },
  { title: "Generador de escritos y modelos", desc: "Crea demandas, recursos y contratos listos para editar y descargar.", icon: "📝" },
  { title: "Análisis de archivos y OCR", desc: "Sube PDF, Word, audio, imagen o video y obtén análisis automático.", icon: "🔍" },
  { title: "Historial y favoritos", desc: "Guarda tus consultas, documentos y fuentes jurídicas preferidas.", icon: "⭐" },
  { title: "Notificaciones y agenda legal", desc: "Alertas de plazos, audiencias y cambios normativos clave.", icon: "⏰" },
  { title: "Soporte premium", desc: "Asistencia personalizada, onboarding y recursos exclusivos.", icon: "👩‍💼" },
];

export default function LandingSaaS() {
  return (
    <div className="bg-gradient-to-r from-[#b03a1a]/40 via-white to-[#b03a1a]/40 min-h-screen w-full flex flex-col">
      {/* HERO */}
      <header className="py-10 px-4 flex flex-col items-center text-center">
        <img src={buholexLogo} alt="BúhoLex" className="w-24 sm:w-32 mb-4 rounded-2xl shadow bg-white" />
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-[#b03a1a] drop-shadow mb-2 leading-snug">
          El SaaS legal <span className="text-[#4b2e19]">que acompaña y potencia tu estudio</span>
        </h1>
        <p className="text-[#4b2e19] text-lg md:text-xl font-medium mb-6 max-w-2xl mx-auto">
          LitisBot integra inteligencia artificial jurídica, buscador multifuente, generación automática de documentos y tu propia agenda legal en la nube.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 mb-6 justify-center w-full max-w-2xl">
          <a href="/registro" className="bg-[#b03a1a] text-white px-8 py-3 rounded-full font-bold text-lg shadow hover:bg-[#a52e00] transition w-full sm:w-auto">
            Probar gratis
          </a>
          <a href="/upgrade" className="bg-white text-[#b03a1a] border-2 border-[#b03a1a] px-8 py-3 rounded-full font-bold text-lg shadow hover:bg-[#fde7e7] transition w-full sm:w-auto">
            Hazte PRO
          </a>
        </div>
        <div className="text-xs text-gray-500 mt-2">
          Sin tarjeta de crédito para la prueba. Cancelas cuando quieras.
        </div>
      </header>

      {/* BENEFICIOS */}
      <section className="py-8 bg-white">
        <div className="max-w-5xl mx-auto px-4">
          <h2 className="text-2xl font-extrabold text-[#b03a1a] text-center mb-6">¿Por qué elegir LitisBot PRO?</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <div key={i} className="bg-[#fff7ee] rounded-2xl shadow p-5 flex flex-col items-center">
                <span className="text-4xl mb-2">{f.icon}</span>
                <span className="font-bold text-[#4b2e19] text-lg mb-1 text-center">{f.title}</span>
                <span className="text-[#75412e] text-sm text-center">{f.desc}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* COMPARATIVO FREE/PRO */}
      <section className="py-8">
        <div className="max-w-4xl mx-auto px-4">
          <h3 className="text-xl font-bold text-[#b03a1a] text-center mb-4">Plan Free vs. Plan PRO</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="border rounded-xl p-5 bg-gray-50">
              <h4 className="font-bold text-[#b03a1a] text-lg mb-2">FREE</h4>
              <ul className="list-disc pl-5 text-[#4b2e19] space-y-1 text-sm">
                <li>3 consultas legales diarias</li>
                <li>Generación básica de escritos</li>
                <li>Acceso a biblioteca virtual</li>
                <li>Notificaciones básicas</li>
                <li>Soporte por email</li>
              </ul>
              <div className="font-bold mt-4 text-[#b03a1a]">S/. 0</div>
            </div>
            <div className="border-2 border-[#b03a1a] rounded-xl p-5 bg-white shadow-lg">
              <h4 className="font-bold text-[#b03a1a] text-lg mb-2">PRO</h4>
              <ul className="list-disc pl-5 text-[#4b2e19] space-y-1 text-sm">
                <li>Consultas y descargas ilimitadas</li>
                <li>Generador avanzado de modelos jurídicos</li>
                <li>Soporte de archivos (PDF, Word, audio, video, imagen)</li>
                <li>Historial, favoritos y backup automático</li>
                <li>Agenda y alertas personalizadas</li>
                <li>Soporte preferente y actualizaciones exclusivas</li>
              </ul>
              <div className="font-bold mt-4 text-[#b03a1a]">S/. 349 / año</div>
            </div>
          </div>
        </div>
      </section>

      {/* TESTIMONIOS */}
      <section className="py-10 bg-[#fff9f6]">
        <div className="max-w-4xl mx-auto px-4">
          <h3 className="text-2xl font-extrabold text-[#b03a1a] text-center mb-6">Qué dicen los profesionales</h3>
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

      {/* CTA FINAL SOLO COMO SECCIÓN */}
      <section className="py-10 bg-white flex flex-col items-center">
        <h3 className="text-2xl font-extrabold text-[#b03a1a] mb-4 text-center">¿Listo para transformar tu estudio?</h3>
        <a
          href="/registro"
          className="inline-block bg-[#b03a1a] text-white px-10 py-4 rounded-full font-bold text-xl shadow hover:bg-[#a52e00] transition"
        >
          Comenzar ahora
        </a>
      </section>
    </div>
  );
}
