import React from "react";
import { motion } from "framer-motion";

const Nosotros = () => {
  return (
    <motion.div
      className="max-w-5xl mx-auto mt-12 p-6 bg-white shadow-md rounded-xl"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <h1 className="text-4xl font-bold text-center text-blue-800 mb-6">
        Sobre BúhoLex
      </h1>

      <p className="text-lg text-gray-700 mb-4">
        <strong>BúhoLex</strong> es un estudio jurídico digital que nace con la visión
        de hacer el derecho accesible, transparente y humano. Nuestro lema:
        <em className="block text-blue-600 mt-2 text-xl">
          “Porque la justicia no debe ser un privilegio de pocos: LitisBot te defiende”.
        </em>
      </p>

      <p className="text-gray-700 mb-4">
        Nuestro equipo está formado por abogados especialistas en derecho civil,
        penal, administrativo y constitucional, comprometidos con la excelencia
        profesional, el análisis argumentativo y el uso de tecnología para brindar
        un servicio legal moderno, eficaz y sin fronteras.
      </p>

      <p className="text-gray-700 mb-4">
        En <strong>BúhoLex</strong> creemos que la información jurídica debe estar al
        alcance de todos. Por eso, nuestra plataforma integra:
      </p>

      <ul className="list-disc list-inside text-gray-700 mb-4">
        <li>Asesoría legal en tiempo real con inteligencia artificial</li>
        <li>Elaboración de escritos judiciales y administrativos personalizados</li>
        <li>Agenda legal con recordatorios inteligentes</li>
        <li>Biblioteca jurídica nacional e internacional</li>
        <li>Blog interactivo para abogados, estudiantes y ciudadanos</li>
        <li>Servicios premium y videoconferencias legales</li>
      </ul>

      <p className="text-gray-700">
        Si eres abogado, también puedes registrarte y obtener tu propia oficina
        virtual personalizada dentro de nuestra plataforma.
      </p>
    </motion.div>
  );
};

export default Nosotros;
