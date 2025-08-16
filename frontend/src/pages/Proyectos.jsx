// src/pages/Proyectos.jsx
import React from "react";

export default function Proyectos() {
  return (
    <section className="min-h-[60vh] py-12 px-4 flex flex-col items-center bg-white">
      <h2 className="text-3xl md:text-4xl font-extrabold text-[#b03a1a] mb-5 text-center">
        Proyectos de Investigación Jurídico-Filosófica
      </h2>
      <p className="text-lg max-w-2xl text-[#4b2e19] text-center mb-6">
        Acceso premium a proyectos, papers y ensayos científicos en Derecho y Filosofía del Derecho, vinculados con los principales repositorios oficiales (Renati, Scielo, Latindex, JSTOR y más). 
        <br /><br />
        <span className="font-bold text-[#e53935]">*Esta sección será de pago, integrando pasarela segura y vinculación a los principales portales científicos y universitarios.*</span>
      </p>
      <div className="bg-[#fff0f0] border border-[#e53935] p-5 rounded-xl shadow-inner text-center">
        <p className="font-semibold text-[#b03a1a]">¿Tienes un proyecto para publicar? <br /> Pronto podrás subir y monetizar tus investigaciones aquí.</p>
      </div>
    </section>
  );
}
