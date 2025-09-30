import React from "react";
import { Link } from "react-router-dom";

export default function DashboardAdmin() {
  return (
    <section className="max-w-2xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6 text-blue-700">Panel de Administración BúhoLex</h1>

      <div className="grid gap-4">
        <Link
          to="/admin/libros"
          className="block bg-green-600 hover:bg-green-700 text-white text-center px-4 py-3 rounded"
        >
          Subir Libros a Biblioteca
        </Link>

        <Link
          to="/admin/consultas"
          className="block bg-purple-600 hover:bg-purple-700 text-white text-center px-4 py-3 rounded"
        >
          Ver Consultas de LitisBot
        </Link>

        <Link
          to="/admin/publicar-articulo"
          className="block bg-blue-600 hover:bg-blue-700 text-white text-center px-4 py-3 rounded"
        >
          Publicar nuevo artículo en el Blog
        </Link>
      </div>
    </section>
  );
}
