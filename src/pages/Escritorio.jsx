import React from "react";
import { motion } from "framer-motion";
import { User } from "lucide-react";
import buhoLogo from "../assets/buho-institucional.png";
import { Link } from "react-router-dom";

export default function Escritorio() {
  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4">
      <motion.div
        className="flex flex-col items-center max-w-2xl w-full py-8"
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
      >
        <img
          src={buhoLogo}
          alt="Logo BúhoLex"
          className="w-20 md:w-28 mb-4 rounded-2xl border-4 border-amber-700 shadow bg-white"
        />
        <User className="text-blue-700 mb-2" size={32} />
        <motion.h1
          className="text-2xl md:text-3xl font-extrabold text-blue-900 mb-3"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1 }}
        >
          Escritorio Legal BúhoLex
        </motion.h1>
        <p className="text-blue-900 text-base md:text-lg mb-6 font-medium">
          Administra tus expedientes, agenda y documentos en un entorno seguro y confidencial.<br />
          Pronto podrás vincular tu escritorio con LitisBot y tu biblioteca jurídica personal.
        </p>
        <div className="w-full bg-blue-50 border border-blue-200 rounded-lg shadow p-4 mb-6 text-center">
          <p className="text-gray-700 font-semibold mb-1">
            <span className="text-amber-700">Próximamente:</span> Gestión avanzada de expedientes y alertas.
          </p>
          <span className="text-gray-500 text-sm">
            Configura tu espacio de trabajo digital y mantente al día con tus procesos.
          </span>
        </div>
        <div className="flex flex-col sm:flex-row gap-4 w-full justify-center">
          <Link
            to="/"
            className="bg-blue-100 text-blue-700 px-6 py-2 rounded-full font-semibold border border-blue-700 hover:bg-blue-200 transition"
          >
            Volver al inicio
          </Link>
          <Link
            to="/servicios"
            className="bg-blue-700 text-white px-6 py-2 rounded-full font-semibold hover:bg-blue-800 transition"
          >
            Ver servicios
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
