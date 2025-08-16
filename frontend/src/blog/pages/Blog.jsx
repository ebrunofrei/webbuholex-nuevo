// src/pages/Blog.jsx
import React from "react";

const Blog = () => {
  const articulosDemo = [
    { titulo: "Falta de convocatoria y judicialización", slug: "tavara-restitucion-benavides", resumen: "¿Por qué Francisco Távara no votó? Análisis completo..." }
  ];

  return (
    <div className="min-h-screen p-6 bg-white">
      <h1 className="text-3xl font-bold text-red-600 mb-4">Blog Jurídico</h1>
      <ul className="space-y-4">
        {articulosDemo.map((a, i) => (
          <li key={i} className="border-b pb-2">
            <a href={`/blog/${a.slug}`} className="text-xl font-semibold text-blue-700 hover:underline">{a.titulo}</a>
            <p className="text-sm text-gray-600">{a.resumen}</p>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Blog;
