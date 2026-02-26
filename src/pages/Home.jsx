// src/pages/Home.jsx
import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import logoBuho from "../assets/buho-institucional.png";
import { useAuth } from "@/context/AuthContext";
import NoticiasPanel from "@/features/noticias/NoticiasPanel";

export default function Home() {
  const navigate = useNavigate();
  const { user, abrirModalLogin } = useAuth() || {};
  const [footerOpen, setFooterOpen] = useState(false);

  const handleOficina = () => {
    if (user) navigate("/oficinaVirtual");
    else abrirModalLogin("login");
  };

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") setFooterOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="relative w-full overflow-x-hidden bg-white">

      {/* Fondos laterales con más presencia */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-y-0 left-0 w-[180px] bg-gradient-to-r from-[#b03a1a]/25 via-[#b03a1a]/10 to-transparent" />
        <div className="absolute inset-y-0 right-0 w-[180px] bg-gradient-to-l from-[#b03a1a]/25 via-[#b03a1a]/10 to-transparent" />
      </div>

      {/* HERO */}
      <motion.section
        className="fixed inset-0 z-30 flex flex-col items-center justify-center text-center px-4"
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.9 }}
      >
        <img
          src={logoBuho}
          alt="Logo BúhoLex"
          className="w-52 rounded-2xl shadow-2xl border-4 border-[#4b2e19] mb-6"
          draggable={false}
        />

        <h1 className="text-4xl sm:text-5xl font-extrabold text-[#b03a1a] mb-3">
          BúhoLex: justicia sin privilegios.
        </h1>

        <p className="text-xl sm:text-3xl font-bold text-[#4b2e19] mb-8">
          LitisBot <span className="text-[#b03a1a]">te acompaña y te defiende.</span>
        </p>

        <div className="flex gap-4 flex-col sm:flex-row">
          <Link
            to="/litisbot"
            className="bg-[#4b2e19] text-white px-8 py-4 rounded-xl font-extrabold shadow-lg hover:bg-[#a87247] hover:scale-[1.02] transition-all"
          >
            Consultar con LitisBot
          </Link>

          <button
            onClick={handleOficina}
            className="border-2 border-[#b03a1a] text-[#b03a1a] px-8 py-4 rounded-xl font-extrabold hover:bg-[#fff3ed] hover:scale-[1.02] transition-all"
          >
            Oficina Virtual Abogados
          </button>
        </div>
      </motion.section>

      <NoticiasPanel />

      {/* Botón inferior */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[60]">
        <button
          onClick={() => setFooterOpen(true)}
          className="rounded-full border border-[#e7d6cc] bg-white/90 backdrop-blur px-6 py-2 shadow-xl text-sm font-semibold text-[#4b2e19] hover:scale-105 transition-all duration-300"
        >
          Transparencia y marco legal
        </button>
      </div>

      {/* ================= MODAL PREMIUM PRO ================= */}
      <AnimatePresence>
        {footerOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              className="fixed inset-0 z-[70] bg-black/50 backdrop-blur-xl"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setFooterOpen(false)}
            />

            {/* Bottom Sheet */}
            <motion.div
              drag="y"
              dragConstraints={{ top: 0 }}
              dragElastic={0.2}
              onDragEnd={(e, info) => {
                if (info.offset.y > 120) setFooterOpen(false);
              }}
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 140, damping: 20 }}
              className="fixed left-0 right-0 bottom-0 z-[80]
                        bg-gradient-to-br from-white via-[#fff7f3] to-[#ffece3]
                        rounded-t-3xl
                        shadow-[0_-30px_100px_rgba(176,58,26,0.35)]
                        border-t-4 border-[#b03a1a]
                        overflow-hidden"
              style={{ height: "min(80vh, 720px)" }}
            >

              {/* Handle */}
              <div className="flex justify-center pt-3">
                <div className="w-12 h-1.5 bg-[#b03a1a]/40 rounded-full" />
              </div>

              {/* Header */}
              <div className="flex items-center justify-between px-10 pt-6 pb-4 border-b border-[#b03a1a]/20">
                <h3 className="text-xl font-extrabold tracking-tight text-[#4b2e19]">
                  BúhoLex LegalTech · Marco Institucional
                </h3>

                <button
                  onClick={() => setFooterOpen(false)}
                  className="text-[#b03a1a] font-semibold hover:scale-110 transition"
                >
                  ✕
                </button>
              </div>

              {/* Content */}
              <div className="h-[calc(100%-120px)] overflow-y-auto px-12 py-12">

                <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-12 text-sm">

                  {/* Marca */}
                  <div>
                    <h4 className="font-bold text-[#4b2e19] mb-4 text-base">
                      BúhoLex LegalTech
                    </h4>

                    <p className="text-gray-800 leading-relaxed">
                      Plataforma jurídica digital especializada en
                      asesoría, jurisprudencia, herramientas procesales,
                      Oficina Virtual y LitisBot.
                    </p>

                    <div className="mt-6 text-xs space-y-2 text-[#4b2e19] font-medium">
                      <p>🔒 Infraestructura segura (SSL)</p>
                      <p>💳 Pagos verificados mediante cuenta empresarial</p>
                      <p>📄 Emisión de Boleta y Factura electrónica</p>
                    </div>

                    <div className="mt-6 text-xs text-gray-600 leading-relaxed">
                      <p className="font-semibold text-[#4b2e19]">
                        Marca comercial registrada ante SUNAT
                      </p>
                      <p>
                        Operada por EMPRESA CONSTRUCTORA, CONSULTORA,
                        BIENES Y SERVICIOS EN GENERAL JULITA S.A.C.
                      </p>
                      <p>RUC: 20571585902</p>
                    </div>
                  </div>

                  {/* Legal */}
                  <div>
                    <h4 className="font-bold text-[#4b2e19] mb-4 text-base">
                      Centro Legal
                    </h4>

                    <ul className="space-y-3">
                      {[
                        ["privacidad", "Política de Privacidad"],
                        ["terminos", "Términos y Condiciones"],
                        ["devoluciones", "Política de Cambios y Devoluciones"],
                        ["reclamaciones", "Libro de Reclamaciones"],
                        ["cookies", "Aviso de Cookies"],
                      ].map(([key, label]) => (
                        <li key={key}>
                          <button
                            onClick={() => {
                              setFooterOpen(false);
                              navigate(`/?legal=${key}`);
                            }}
                            className="text-[#b03a1a] font-medium hover:translate-x-2 hover:text-[#7a1f0f] transition-all duration-200"
                          >
                            {label}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Información Empresarial */}
                  <div>
                    <h4 className="font-bold text-[#4b2e19] mb-4 text-base">
                      Información Empresarial
                    </h4>

                    <p className="text-gray-800 mb-2">
                      📍 Barranca, Perú
                    </p>

                    <p className="text-gray-800 mb-2">
                      Banco de Crédito del Perú (BCP)
                    </p>

                    <div className="text-xs text-gray-700 space-y-1">
                      <p><strong>Cuenta Corriente (S/):</strong></p>
                      <p>1917319318003</p>

                      <p className="mt-2"><strong>CCI:</strong></p>
                      <p>00219100731931800358</p>
                    </div>

                    <div className="mt-6 flex gap-3 flex-wrap">

                      <a
                        href="https://www.facebook.com/litisbotlegaltech/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-2 rounded-full bg-[#b03a1a] text-white text-xs font-semibold shadow-md hover:scale-105 hover:bg-[#7a1f0f] transition-all"
                      >
                        Facebook
                      </a>

                      <a
                        href="https://www.youtube.com/channel/UC9soi-UZohvJbNSpVIS8W1g"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-2 rounded-full bg-[#4b2e19] text-white text-xs font-semibold shadow-md hover:scale-105 hover:bg-black transition-all"
                      >
                        YouTube
                      </a>

                    </div>
                  </div>

                </div>

                {/* Footer institucional */}
                <div className="mt-16 pt-8 border-t border-[#b03a1a]/20 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-gray-600 font-medium tracking-wide">
                  <span>
                    © {new Date().getFullYear()} BúhoLex LegalTech.
                    Todos los derechos reservados.
                  </span>

                  <span className="italic text-[#4b2e19]">
                    “Que la ley sea faro, no laberinto.”
                  </span>
                </div>

              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}