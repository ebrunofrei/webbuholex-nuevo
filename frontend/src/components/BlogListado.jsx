// src/components/BlogListado.jsx
import React, { useEffect, useState } from "react";
import { collection, query, orderBy, getDocs } from "firebase/firestore";
import { db } from "@/firebase";

function Card({ articulo, onClick }) {
  return (
    <div className="rounded-xl shadow-lg border-2 border-[#7a2518] bg-white overflow-hidden flex flex-col hover:scale-105 transition cursor-pointer" onClick={onClick}>
      {articulo.imagenPortada && (
        <img src={articulo.imagenPortada} alt="Portada" className="h-40 w-full object-cover" />
      )}
      <div className="p-4 flex-1 flex flex-col">
        <h3 className="font-bold text-lg text-[#7a2518] mb-1">{articulo.titulo}</h3>
        <p className="text-[#3e2723] mb-2 text-sm">{articulo.resumen}</p>
        <div className="mt-auto flex flex-wrap gap-2">
          {articulo.tags?.map((tag, i) => (
            <span key={i} className="bg-[#7a2518] text-white text-xs rounded px-2 py-1">{tag}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function BlogListado() {
  const [articulos, setArticulos] = useState([]);
  const [articuloSel, setArticuloSel] = useState(null);

  useEffect(() => {
    async function fetchArticulos() {
      const q = query(collection(db, "blog_articulos"), orderBy("fecha", "desc"));
      const snap = await getDocs(q);
      setArticulos(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }
    fetchArticulos();
  }, []);

  return (
    <div className="max-w-5xl mx-auto px-2">
      <h2 className="text-3xl font-bold text-[#7a2518] mb-6 text-center">Blog Jurídico</h2>
      <div className="grid md:grid-cols-3 gap-6">
        {articulos.map(art => (
          <Card key={art.id} articulo={art} onClick={() => setArticuloSel(art)} />
        ))}
      </div>
      {/* Modal para leer artículo */}
      {articuloSel && (
        <div className="fixed z-40 inset-0 bg-black/60 flex items-center justify-center">
          <div className="bg-white max-w-xl w-full rounded-xl shadow-xl p-8 mx-2 relative overflow-y-auto max-h-[90vh]">
            <button className="absolute top-3 right-3 text-xl" onClick={() => setArticuloSel(null)}>✕</button>
            {articuloSel.imagenPortada && <img src={articuloSel.imagenPortada} className="rounded w-full max-h-56 object-cover mb-4" alt="Portada" />}
            <h3 className="text-2xl font-bold text-[#7a2518] mb-2 text-center">{articuloSel.titulo}</h3>
            <div className="text-[#3e2723] mb-2 text-center font-semibold">{articuloSel.resumen}</div>
            <div className="text-[#222] leading-relaxed text-lg max-w-prose mx-auto mb-6 whitespace-pre-line">{articuloSel.contenido}</div>
            <div className="flex flex-wrap gap-2 justify-center">
              {articuloSel.tags?.map((tag, i) => (
                <span key={i} className="bg-[#7a2518] text-white text-xs rounded px-2 py-1">{tag}</span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
