import React, { useState } from "react";
import { motion } from "framer-motion";
import PageContainer from "@/components/PageContainer";

const Contacto = () => {
  const [formData, setFormData] = useState({
    nombre: "",
    correo: "",
    asunto: "",
    mensaje: "",
  });

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    alert("Tu mensaje ha sido enviado. Te responderemos pronto.");
    setFormData({
      nombre: "",
      correo: "",
      asunto: "",
      mensaje: "",
    });
  };

  return (
    <PageContainer>
      <motion.div
        className="max-w-2xl mx-auto mt-10 p-6 rounded-2xl shadow-md bg-white"
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <h2 className="text-3xl font-bold text-center text-buholex-brown mb-6">
          Contáctanos
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block font-medium mb-1">Nombre completo</label>
            <input
              type="text"
              name="nombre"
              value={formData.nombre}
              onChange={handleChange}
              required
              className="w-full border border-gray-300 p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-buholex-brown"
            />
          </div>
          <div>
            <label className="block font-medium mb-1">Correo electrónico</label>
            <input
              type="email"
              name="correo"
              value={formData.correo}
              onChange={handleChange}
              required
              className="w-full border border-gray-300 p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-buholex-brown"
            />
          </div>
          <div>
            <label className="block font-medium mb-1">Asunto</label>
            <input
              type="text"
              name="asunto"
              value={formData.asunto}
              onChange={handleChange}
              required
              className="w-full border border-gray-300 p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-buholex-brown"
            />
          </div>
          <div>
            <label className="block font-medium mb-1">Mensaje</label>
            <textarea
              name="mensaje"
              value={formData.mensaje}
              onChange={handleChange}
              rows="5"
              required
              className="w-full border border-gray-300 p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-buholex-brown"
            ></textarea>
          </div>
          <button
            type="submit"
            className="bg-[#7a2518] text-white py-2 px-6 rounded-xl hover:bg-[#3e2723] transition font-semibold w-full"
          >
            Enviar mensaje
          </button>
        </form>
      </motion.div>
    </PageContainer>
  );
};

export default Contacto;
