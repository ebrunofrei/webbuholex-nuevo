import React from "react"; 
import { motion } from "framer-motion";
import buhoLogo from "../assets/buho-institucional.png"; // Asegúrate que esta sea la ruta real

export default function Bienvenida() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-white px-4 py-8">
      {/* LOGO con rebote/glow */}
      <motion.div
        initial={{ scale: 0.8, boxShadow: "0 0 0px #FFD700" }}
        animate={{
          scale: [1.15, 0.98, 1.05, 1],
          boxShadow: [
            "0 0 24px #FFD70055, 0 0 8px #FFECB3",
            "0 0 16px #FFD70099",
            "0 0 8px #FFD70033",
            "0 0 0px #FFD70000",
          ],
        }}
        transition={{ duration: 1.2, type: "spring", bounce: 0.45 }}
        className="mx-auto mt-8 mb-2 bg-white rounded-3xl border-4 border-amber-600 shadow-xl"
        style={{
          maxWidth: 260,
          width: "90vw",
          aspectRatio: "1/1",
          overflow: "hidden",
        }}
      >
        <img
          src={buhoLogo}
          alt="Logo BúhoLex"
          className="w-full h-full object-contain select-none"
          draggable={false}
        />
      </motion.div>
      {/* TITULO */}
      <h1 className="text-3xl font-extrabold text-amber-800 text-center mt-2 tracking-wide drop-shadow">
        BÚHOLEX
      </h1>
      {/* Slogan */}
      <p className="text-base md:text-lg font-semibold text-gray-700 text-center mb-6">
        Justicia sin privilegios.
      </p>
      {/* Opcional: Links y botones */}
      <div className="flex flex-col items-center gap-2">
        <a
          href="/servicios"
          className="text-blue-700 font-medium underline hover:text-amber-700 transition"
        >
          Explorar servicios
        </a>
        <a
          href="/litisbot"
          className="text-blue-600 hover:text-amber-700 font-semibold"
        >
          Probar LitisBot
        </a>
      </div>
    </div>
  );
}

