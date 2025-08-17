import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { obtenerCodigos, obtenerArticulosPorCodigo } from "../services/firebaseCodigosService";

export default function CodigoDetalle() {
  const { id } = useParams();
  const [codigo, setCodigo] = useState(null);
  const [articulos, setArticulos] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const codigos = await obtenerCodigos();
        setCodigo(codigos.find(c => c.id === id));
        setArticulos(await obtenerArticulosPorCodigo(id));
      } catch {
        setCodigo(null);
        setArticulos([]);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [id]);

  const filtrados = articulos.filter(
    a =>
      (a.titulo && a.titulo.toLowerCase().includes(busqueda.toLowerCase())) ||
      (a.texto && a.texto.toLowerCase().includes(busqueda.toLowerCase()))
  );

  if (loading) return <div className="text-center mt-12 text-2xl">Cargando...</div>;
  if (!codigo)
    return (
      <div className="text-center mt-12 text-red-600 text-2xl">
        Código no encontrado.
        <br />
        <Link to="/codigos" className="text-blue-700 underline text-xl">Volver a códigos</Link>
      </div>
    );

  return (
    <div className="max-w-4xl mx-auto py-8 px-2 md:px-4">
      <div className="mb-6">
        <Link to="/codigos" className="text-blue-600 text-2xl hover:underline font-medium">
          &larr; Volver a la lista de códigos
        </Link>
      </div>
      <h1 className="text-4xl font-extrabold mb-4 text-blue-900 drop-shadow">{codigo.titulo || codigo.codigo}</h1>
      <div className="mb-4 text-gray-700 text-2xl">{codigo.descripcion}</div>
      <input
        type="text"
        placeholder="Buscar artículo o texto…"
        className="w-full mb-8 p-4 text-2xl border-2 rounded-xl focus:ring-2 focus:ring-blue-300 outline-none"
        value={busqueda}
        onChange={e => setBusqueda(e.target.value)}
        style={{ fontSize: "2rem" }}
      />
      <div className="space-y-8 max-h-[65vh] overflow-y-auto pb-2">
        {filtrados.length === 0 ? (
          <div className="text-center text-gray-400 text-2xl">No se encontraron artículos.</div>
        ) : (
          filtrados.map(a => (
            <div key={a.id} className="border-b-2 pb-7">
              <div className="flex justify-between items-center mb-2">
                <span className="font-black text-red-800 text-3xl">{a.titulo}</span>
                <button
                  title="Copiar artículo"
                  className="text-xl px-5 py-2 bg-blue-200 hover:bg-blue-400 text-blue-900 rounded-lg font-bold transition"
                  onClick={() =>
                    navigator.clipboard.writeText(`${a.titulo}: ${a.texto}`)
                  }
                >
                  Copiar
                </button>
              </div>
              <div className="pl-3 text-gray-900 text-2xl leading-loose whitespace-pre-line break-words">
                {a.texto}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
