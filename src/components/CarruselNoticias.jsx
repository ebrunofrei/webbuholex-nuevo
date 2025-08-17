// src/components/CarruselNoticias.jsx
import React, { useState, useEffect } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

const noticias = [
  {
    titulo: "BúhoLex en el Congreso Nacional de Derecho",
    fecha: "15/06/2025",
    resumen: "Fuimos invitados como ponentes en el evento más importante del sector jurídico del país.",
    link: "/blog/articulo-tavara"
  },
  {
    titulo: "Publicación: Demandas modelo 2025",
    fecha: "17/06/2025",
    resumen: "Descarga gratis modelos actualizados de demandas civiles y penales desde nuestra biblioteca legal.",
    link: "/biblioteca"
  },
  {
    titulo: "Nuevo servicio: Oficina Virtual para abogados",
    fecha: "19/06/2025",
    resumen: "Abogados independientes ahora pueden contar con presencia digital en BúhoLex sin necesidad de web propia.",
    link: "/oficina-virtual"
  }
];

export default function CarruselNoticias() {
  const [actual, setActual] = useState(0);

  useEffect(() => {
    const intervalo = setInterval(() => {
      setActual((prev) => (prev + 1) % noticias.length);
    }, 7000);
    return () => clearInterval(intervalo);
  }, []);

  const siguiente = () => setActual((actual + 1) % noticias.length);
  const anterior = () => setActual((actual - 1 + noticias.length) % noticias.length);

  return (
    <div className="bg-yellow-50 border border-yellow-300 rounded-md shadow-md mx-4 my-8 p-6 relative overflow-hidden">
      <h3 className="text-xl font-semibold mb-2 text-yellow-900 flex items-center">
        📰 Noticias
      </h3>

      <div>
        <h4 className="text-lg font-bold text-gray-800 mb-1">{noticias[actual].titulo}</h4>
        <p className="text-sm text-gray-500 mb-2">{noticias[actual].fecha}</p>
        <p className="text-gray-700 mb-2">{noticias[actual].resumen}</p>
        <Link to={noticias[actual].link} className="text-blue-600 font-semibold hover:underline">
          Leer más →
        </Link>
      </div>

      <div className="absolute top-6 right-6 flex gap-2">
        <button onClick={anterior} className="text-gray-500 hover:text-black">
          <ArrowLeft size={20} />
        </button>
        <button onClick={siguiente} className="text-gray-500 hover:text-black">
          <ArrowRight size={20} />
        </button>
      </div>

      <div className="flex justify-center mt-4 gap-2">
        {noticias.map((_, index) => (
          <span
            key={index}
            className={`w-3 h-3 rounded-full ${index === actual ? "bg-yellow-600" : "bg-gray-300"}`}
          ></span>
        ))}
      </div>
    </div>
  );
}
