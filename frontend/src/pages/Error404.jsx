import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";

const Error404 = () => {
  return (
    <motion.div
      className="min-h-screen flex flex-col items-center justify-center bg-gray-100 text-center p-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <h1 className="text-6xl font-bold text-red-600 mb-4">404</h1>
      <p className="text-xl md:text-2xl text-gray-700 mb-6">
        Lo sentimos, la página que buscas no existe.
      </p>
      <Link
        to="/"
        className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-md transition duration-300"
      >
        Volver al inicio
      </Link>
    </motion.div>
  );
};

export default Error404;
