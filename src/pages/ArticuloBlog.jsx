import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../services/firebaseConfig";

export default function ArticuloBlog() {
  const { id } = useParams();
  const [articulo, setArticulo] = useState(null);

  useEffect(() => {
    const fetchArticulo = async () => {
      const ref = doc(db, "articulosBlog", id);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const data = snap.data();
        const fecha = data.fecha?.toDate()?.toLocaleDateString("es-PE", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        }) || "Sin fecha";
        setArticulo({ ...data, fecha });
      }
    };
    fetchArticulo();
  }, [id]);

  if (!articulo) {
    return <p className="p-6 text-center text-gray-500">Cargando artículo...</p>;
  }

  return (
    <section className="max-w-3xl mx-auto px-6 py-12">
      <Link to="/blog" className="text-blue-600 hover:underline text-sm mb-4 inline-block">
        ← Volver al blog
      </Link>

      <h1 className="text-3xl font-bold text-gray-800 mb-2">{articulo.titulo}</h1>
      <p className="text-sm text-gray-600 mb-1">
        <strong>Categoría:</strong> {articulo.categoria}
      </p>
      <p className="text-sm text-gray-600 mb-6 italic">
        <strong>Por:</strong> {articulo.autor} · {articulo.fecha}
      </p>
      <article className="text-gray-800 whitespace-pre-line leading-relaxed">
        {articulo.contenido}
      </article>
    </section>
  );
}
