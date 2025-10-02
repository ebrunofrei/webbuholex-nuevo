import React from "react";
import { BookOpen, Scale, FileText } from "lucide-react";
import { Link } from "react-router-dom";

export default function Biblioteca() {
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
    </main>
  );
}
