import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { obtenerHistorialArchivos } from "../services/firebaseLitisBotService"; // Ajusta import

export default function HistorialArchivos() {
  const { user } = useAuth();
  const [archivos, setArchivos] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const cargar = async () => {
      setLoading(true);
      if (user && user.uid) {
        const datos = await obtenerHistorialArchivos(user.uid);
        setArchivos(datos || []);
      }
      setLoading(false);
    };
    cargar();
  }, [user]);

  const filtrados = archivos.filter(
    f =>
      f.nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
      f.tipo?.toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <div className="max-w-3xl mx-auto py-10 px-4">
      <h1 className="text-3xl font-bold text-[#b03a1a] mb-4">Historial de archivos analizados</h1>
      <div className="flex flex-col md:flex-row items-center gap-3 mb-5">
        <input
          type="text"
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          placeholder="Buscar por nombre o tipo (pdf, word, imagen...)"
          className="flex-1 border px-3 py-2 rounded text-[#4b2e19]"
        />
      </div>

      {loading && <div className="text-[#b03a1a] font-bold my-8">Cargando archivos...</div>}

      {!loading && filtrados.length === 0 && (
        <div className="text-[#4b2e19] font-medium my-8">No se encontraron archivos en el historial.</div>
      )}

      <div className="space-y-4">
        {filtrados.map((f, i) => (
          <div
            key={f.id || i}
            className="p-4 rounded-xl shadow border bg-white border-[#e5c9b2] flex items-center gap-5"
          >
            {/* Ícono tipo archivo */}
            <span
              style={{
                minWidth: 42, minHeight: 42,
                background: "#fde7e7", color: "#b03a1a",
                fontWeight: 900, fontSize: 23, borderRadius: "50%", display: "flex",
                alignItems: "center", justifyContent: "center"
              }}
            >
              {f.tipo?.includes("pdf") && <span>📄</span>}
              {f.tipo?.includes("word") && <span>📝</span>}
              {f.tipo?.includes("image") && <span>🖼️</span>}
              {f.tipo?.includes("audio") && <span>🔊</span>}
              {f.tipo?.includes("video") && <span>🎥</span>}
              {!f.tipo && <span>📁</span>}
            </span>
            <div className="flex-1">
              <div className="font-semibold text-[#4b2e19]">{f.nombre || "Sin nombre"}</div>
              <div className="text-sm text-[#b03a1a]">
                {f.tipo || "tipo desconocido"} · {f.fecha && new Date(f.fecha).toLocaleString()}
              </div>
            </div>
            {/* Visualizar o descargar */}
            {f.url && (
              <a
                href={f.url}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-[#b03a1a] text-white rounded-xl px-4 py-2 font-bold hover:bg-[#a52e00] transition"
              >
                Descargar
              </a>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
