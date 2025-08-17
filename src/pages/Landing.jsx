import React from 'react';
import { motion } from 'framer-motion';

export default function Landing() {
  return (
    <section
      className="relative min-h-screen flex items-center justify-center text-white overflow-hidden"
    >
      {/* Fondo gradiente rojo-blanco puro, sin imagen */}
      <div
        className="absolute inset-0 w-full h-full z-0"
        style={{
          background: 'radial-gradient(circle at 60% 40%, #ff3232 0%, #b60000 40%, #111 100%)',
        }}
      />
      {/* Overlay blanco translúcido como efecto de brillo */}
      <div className="absolute inset-0 z-10 pointer-events-none">
        <svg width="100%" height="100%" className="absolute opacity-30" style={{ mixBlendMode: 'screen' }}>
          <ellipse cx="60%" cy="40%" rx="380" ry="160" fill="white" />
          <ellipse cx="80%" cy="70%" rx="200" ry="70" fill="white" />
        </svg>
      </div>

      <div className="relative z-20 max-w-6xl w-full px-6 md:px-12 text-center">
        <motion.h1
          className="text-4xl md:text-6xl font-bold leading-tight mb-6"
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          BÚHOLEX
        </motion.h1>

        <motion.p
          className="text-lg md:text-xl mb-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          “Porque la justicia no debe ser un privilegio: Litisbot te defiende”
        </motion.p>

        <div className="flex flex-col md:flex-row gap-4 justify-center">
          <a
            href="/servicios"
            className="bg-white text-black px-6 py-3 rounded-lg font-semibold hover:bg-gray-200 transition"
          >
            Ver Servicios
          </a>
          <a
            href="/blog?categoria=Actualidad Legal"
            className="bg-blue-600 px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition"
          >
            Actualidad Legal
          </a>
          <a
            href="/oficina-virtual"
            className="bg-red-600 px-6 py-3 rounded-lg font-semibold hover:bg-red-500 transition"
          >
            Oficina Virtual
          </a>
          <a
            href="/contacto"
            className="border border-white px-6 py-3 rounded-lg font-semibold hover:bg-white hover:text-black transition"
          >
            Contáctanos
          </a>
        </div>

        <div className="mt-10 flex justify-center">
          <img
            src="/fundador-eduardo.jpeg"
            alt="Fundador de BúhoLex"
            className="w-40 h-40 rounded-full border-4 border-white shadow-lg"
          />
        </div>

        <p className="mt-4 font-light text-sm">Eduardo Frei Bruno Gómez — Fundador de BúhoLex</p>
      </div>
    </section>
  );
}
