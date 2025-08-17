import React, { useState } from "react";
import { collection, addDoc } from "firebase/firestore";
import { db } from "../../services/firebaseConfig";

export default function SubirLibro() {
  const [titulo, setTitulo] = useState("");
  const [autor, setAutor] = useState("");
  const [enlace, setEnlace] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [cargando, setCargando] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setCargando(true);
    setMensaje("");
    try {
      await addDoc(collection(db, "biblioteca"), {
        titulo,
        autor,
        enlace,
        fechaSubida: new Date(),
      });
      setMensaje("✅ Libro subido correctamente.");
      setTitulo("");
      setAutor("");
      setEnlace("");
    } catch (error) {
      setMensaje("❌ Error al subir el libro. Intenta nuevamente.");
    }
    setCargando(false);
  };

  return (
    <div className="max-w-md mx-auto bg-white shadow-xl p-6 rounded-xl mt-8">
      <h2 className="text-xl font-bold mb-4">Subir nuevo libro</h2>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <input
          className="border p-2 rounded"
          type="text"
          placeholder="Título del libro"
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          required
        />
        <input
          className="border p-2 rounded"
          type="text"
          placeholder="Autor"
          value={autor}
          onChange={(e) => setAutor(e.target.value)}
          required
        />
        <input
          className="border p-2 rounded"
          type="url"
          placeholder="Enlace de Google Drive o URL PDF"
          value={enlace}
          onChange={(e) => setEnlace(e.target.value)}
          required
        />
        <button
          className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded font-bold"
          type="submit"
          disabled={cargando}
        >
          {cargando ? "Subiendo..." : "Subir libro"}
        </button>
        {mensaje && (
          <div
            className={
              mensaje.includes("Error")
                ? "text-red-600 mt-2"
                : "text-green-600 mt-2"
            }
          >
            {mensaje}
          </div>
        )}
      </form>
    </div>
  );
}
