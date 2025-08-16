import React, { useState } from "react";
import { db } from "../../services/firebaseConfig";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

export default function PublicarArticulo() {
  const [titulo, setTitulo] = useState("");
  const [contenido, setContenido] = useState("");
  const [autor, setAutor] = useState("Equipo BúhoLex");
  const [categoria, setCategoria] = useState("Opinión Jurídica");
  const [mensaje, setMensaje] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, "articulosBlog"), {
        titulo,
        contenido,
        autor,
        categoria,
        fecha: serverTimestamp(),
      });
      setMensaje("✅ Artículo publicado correctamente.");
      setTitulo("");
      setContenido("");
    } catch (error) {
      setMensaje("❌ Error al publicar el artículo.");
      console.error(error);
    }
  };

  return (
    <section className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4 text-blue-700">Publicar nuevo artículo</h1>
      {mensaje && <div className="mb-4 text-sm">{mensaje}</div>}
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="text"
          placeholder="Título del artículo"
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          className="w-full border rounded p-2"
          required
        />
        <textarea
          placeholder="Contenido del artículo..."
          value={contenido}
          onChange={(e) => setContenido(e.target.value)}
          className="w-full border rounded p-2 h-40"
          required
        />
        <input
          type="text"
          placeholder="Autor"
          value={autor}
          onChange={(e) => setAutor(e.target.value)}
          className="w-full border rounded p-2"
        />
        <select
          value={categoria}
          onChange={(e) => setCategoria(e.target.value)}
          className="w-full border rounded p-2"
        >
          <option>Opinión Jurídica</option>
          <option>Actualidad Legal</option>
          <option>Casos y Fallos</option>
          <option>Constitucional</option>
        </select>
        <button
          type="submit"
          className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
        >
          Publicar Artículo
        </button>
      </form>
    </section>
  );
}
