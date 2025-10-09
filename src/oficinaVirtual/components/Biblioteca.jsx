import React, { useState, useEffect } from "react";
import { BookOpen, Scale, FileText } from "lucide-react";
import { Link } from "react-router-dom";
import axios from "axios";

export default function Biblioteca() {
  // Estado para manejar los archivos de la biblioteca
  const [archivos, setArchivos] = useState([]);

  useEffect(() => {
    // Obtener los archivos de la biblioteca desde la API (esto es solo un ejemplo)
    const fetchArchivos = async () => {
      try {
        const response = await axios.get("/api/biblioteca"); // Ajusta según tu ruta
        setArchivos(response.data); // Asume que la respuesta tiene una propiedad `data` con los archivos
      } catch (error) {
        console.error("Error al obtener archivos:", error);
      }
    };

    fetchArchivos();
  }, []);

  const categorias = [
    {
      nombre: "Códigos",
      descripcion: "Accede a los códigos civiles, procesales y especiales actualizados.",
      icon: <FileText size={42} strokeWidth={1.6} />,
      link: "/biblioteca/codigos",
    },
    {
      nombre: "Jurisprudencia",
      descripcion: "Consulta jurisprudencia relevante y resoluciones recientes.",
      icon: <Scale size={42} strokeWidth={1.6} />,
      link: "/biblioteca/jurisprudencia",
    },
    {
      nombre: "Libros",
      descripcion: "Explora libros jurídicos y material doctrinario en formato digital.",
      icon: <BookOpen size={42} strokeWidth={1.6} />,
      link: "/biblioteca/libros",
    },
  ];

  return (
    <main className="max-w-6xl mx-auto px-4 py-12">
      {/* Encabezado */}
      <h1 className="text-3xl md:text-4xl font-extrabold text-[#b03a1a] mb-4 text-center">
        Biblioteca Jurídica
      </h1>
      <p className="text-center text-gray-600 max-w-2xl mx-auto mb-12">
        Tu biblioteca jurídica personalizada para acceder a <span className="font-medium">códigos, jurisprudencia y libros</span>.
        Todo organizado y actualizado para facilitar tu práctica profesional.
      </p>

      {/* Grid de categorías */}
      <section className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {categorias.map((cat, idx) => (
          <Link
            key={idx}
            to={cat.link}
            className="group border border-gray-200 rounded-xl p-6 bg-white 
                       shadow-md hover:shadow-xl transition-all 
                       flex flex-col items-center text-center hover:border-[#b03a1a] focus:outline-none focus:ring-2 focus:ring-[#b03a1a]/50"
          >
            <div className="text-[#b03a1a] mb-4 group-hover:scale-110 transition-transform">
              {cat.icon}
            </div>
            <h2 className="text-xl font-semibold text-[#4b2e19] group-hover:text-[#b03a1a] transition-colors">
              {cat.nombre}
            </h2>
            <p className="text-sm text-gray-600 mt-2 leading-relaxed">{cat.descripcion}</p>
          </Link>
        ))}
      </section>

      {/* Lista de archivos en la biblioteca */}
      <section className="mt-12">
        <h2 className="text-2xl font-semibold text-center text-[#b03a1a] mb-6">Archivos Disponibles</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {archivos.length > 0 ? (
            archivos.map((archivo, idx) => (
              <div
                key={idx}
                className="flex flex-col bg-white border border-gray-200 rounded-lg p-6 shadow-md hover:shadow-xl"
              >
                <h3 className="text-lg font-semibold text-[#4b2e19]">{archivo.nombre}</h3>
                <p className="text-sm text-gray-600 mt-2">Materia: {archivo.materia} | Año: {archivo.año}</p>
                <div className="mt-4 flex justify-between">
                  <button
                    className="bg-[#b03a1a] text-white px-4 py-2 rounded-lg hover:bg-[#9e3416]"
                    onClick={() => window.open(archivo.url, "_blank")} // Abre el archivo en una nueva pestaña
                  >
                    Ver
                  </button>
                  <button
                    className="bg-[#b03a1a] text-white px-4 py-2 rounded-lg hover:bg-[#9e3416]"
                    onClick={() => window.location.href = archivo.url} // Descarga el archivo
                  >
                    Descargar
                  </button>
                </div>
              </div>
            ))
          ) : (
            <p className="text-center text-gray-600">No hay archivos disponibles en la biblioteca.</p>
          )}
        </div>
      </section>
    </main>
  );
}
