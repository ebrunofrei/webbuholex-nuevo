import React from "react";
import buholexLogo from "../assets/buho-institucional.png";

// Cambia estos por los tuyos:
const WHATSAPP_LINK = "https://wa.me/51987654321?text=Hola,%20quiero%20más%20info%20de%20LitisBot";
const TELEGRAM_LINK = "https://t.me/tuUsuarioTelegram"; // tu canal o bot

export default function LandingMinimalistaDemo() {
  return (
    <div className="bg-gradient-to-b from-[#b03a1a]/70 via-white to-[#b03a1a]/10 min-h-screen w-full flex flex-col">
      {/* HERO */}
      <header className="flex flex-col items-center text-center px-4 py-10">
        <img
          src={buholexLogo}
          alt="BúhoLex"
          className="w-20 h-20 rounded-xl shadow mb-4 bg-white"
        />
        <h1 className="text-2xl font-black text-[#b03a1a] mb-2">
          LitisBot SaaS Legal
        </h1>
        <p className="text-[#4b2e19] text-base font-medium mb-4">
          Tu asistente legal con IA, buscador multifuente y generación automática de modelos. Gratis o PRO.
        </p>
        <a
          href="/registro"
          className="bg-[#b03a1a] text-white font-bold rounded-full px-8 py-3 shadow hover:bg-[#a52e00] mb-2 w-full max-w-xs"
        >
          Probar gratis
        </a>
        <a
          href="/upgrade"
          className="text-[#b03a1a] font-semibold underline text-sm"
        >
          Ver beneficios PRO
        </a>
        {/* Botones WhatsApp/Telegram */}
        <div className="flex gap-4 justify-center mt-4">
          <a
            href={WHATSAPP_LINK}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 bg-green-100 text-green-900 font-bold px-4 py-2 rounded-full shadow hover:bg-green-200"
          >
            <span role="img" aria-label="WhatsApp">💬</span> WhatsApp
          </a>
          <a
            href={TELEGRAM_LINK}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 bg-blue-100 text-blue-900 font-bold px-4 py-2 rounded-full shadow hover:bg-blue-200"
          >
            <span role="img" aria-label="Telegram">✈️</span> Telegram
          </a>
        </div>
      </header>

      {/* VIDEO DEMO */}
      <section className="px-4 my-4">
        <div className="bg-white rounded-xl shadow p-3">
          <div className="font-semibold text-[#b03a1a] text-center mb-2">
            ¿Cómo funciona LitisBot? Mira el demo:
          </div>
          <div className="aspect-w-16 aspect-h-9 w-full rounded-xl overflow-hidden">
            {/* Si usas Youtube/Vimeo, cambia el src */}
            <iframe
              src="https://www.youtube.com/embed/lI4hZtOiDbw" // Reemplaza por tu video
              title="Video demo LitisBot"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="w-full min-h-[180px] sm:min-h-[320px] border-none rounded"
            ></iframe>
          </div>
        </div>
      </section>

      {/* BENEFICIOS CARDS */}
      <section className="mt-6 px-2">
        <div className="grid gap-4">
          <div className="bg-white rounded-xl shadow p-4 flex items-center gap-3">
            <span className="text-2xl">📚</span>
            <span className="text-[#4b2e19] text-sm font-semibold">Busca en legis.pe, El Peruano y más</span>
          </div>
          <div className="bg-white rounded-xl shadow p-4 flex items-center gap-3">
            <span className="text-2xl">📝</span>
            <span className="text-[#4b2e19] text-sm font-semibold">Modelos automáticos y descargas ilimitadas</span>
          </div>
          <div className="bg-white rounded-xl shadow p-4 flex items-center gap-3">
            <span className="text-2xl">⭐</span>
            <span className="text-[#4b2e19] text-sm font-semibold">Historial y favoritos siempre disponibles</span>
          </div>
        </div>
      </section>

      {/* TESTIMONIO MINI */}
      <section className="my-8 px-4">
        <div className="bg-[#fff7ee] rounded-xl shadow p-4 text-center">
          <span className="text-[#b03a1a] font-bold">"Consulto y redacto en minutos. Mi estudio ahorra horas cada semana."</span>
          <div className="text-[#4b2e19] text-xs mt-2">– Abg. Valeria Muñoz</div>
        </div>
      </section>

      {/* FOOTER/CTA FINAL */}
      <footer className="mt-auto py-5 px-4 bg-white text-center text-xs text-[#75412e] rounded-t-xl shadow-inner">
        <span>
          ¿Listo para probar?{" "}
          <a
            href="/registro"
            className="font-bold underline text-[#b03a1a]"
          >
            Regístrate gratis
          </a>
        </span>
        <div className="mt-2 text-gray-400">
          © {new Date().getFullYear()} BúhoLex · LitisBot
        </div>
      </footer>
    </div>
  );
}
