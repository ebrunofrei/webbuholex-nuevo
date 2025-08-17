import React, { useState, useEffect } from "react";
import { FolderOpen, X, Download, Trash2, Share2 } from "lucide-react";
import { collection, query, where, orderBy, getDocs, deleteDoc, doc, updateDoc } from "firebase/firestore";
import { db } from "@/services/firebaseConfig";

export default function SidebarArchivosAnalizados({ usuarioId, show, onClose }) {
  const [archivos, setArchivos] = useState([]);
  const [filtro, setFiltro] = useState("");
  const [expedienteSeleccionado, setExpedienteSeleccionado] = useState("");
  const [compartiendoId, setCompartiendoId] = useState(null);
  const [emailCompartir, setEmailCompartir] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!usuarioId) return;
    const cargarArchivos = async () => {
      const q = query(
        collection(db, "litisbot_archivos_analizados"),
        where("uid", "==", usuarioId),
        orderBy("fecha", "desc")
      );
      const snap = await getDocs(q);
      setArchivos(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    };
    cargarArchivos();
  }, [usuarioId, loading]);

  const expedientes = [
    ...new Set(archivos.map(a => a.expedienteNumero || "Sin expediente"))
  ];

  const archivosFiltrados = archivos
    .filter(a =>
      (!expedienteSeleccionado || expedienteSeleccionado === "Todos" || a.expedienteNumero === expedienteSeleccionado) &&
      (a.archivoOriginalNombre?.toLowerCase().includes(filtro.toLowerCase()) ||
        a.resumen?.toLowerCase().includes(filtro.toLowerCase()))
    );

  // BORRAR archivo analizado (Firestore)
  const borrarArchivo = async id => {
    if (!window.confirm("¿Seguro que deseas eliminar este archivo analizado?")) return;
    setLoading(true);
    try {
      await deleteDoc(doc(db, "litisbot_archivos_analizados", id));
    } catch (err) {
      alert("No se pudo borrar el archivo.");
    }
    setLoading(false);
  };

  // Compartir: ejemplo simple, solo agrega el email al campo 'compartidoCon' (array)
  const compartirArchivo = async (archivoId, email) => {
    if (!email.trim()) return alert("Debes ingresar un email.");
    setLoading(true);
    try {
      const archivoRef = doc(db, "litisbot_archivos_analizados", archivoId);
      await updateDoc(archivoRef, {
        compartidoCon: Array.from(new Set([email.trim().toLowerCase()]))
      });
      alert("Archivo compartido exitosamente.");
      setEmailCompartir("");
      setCompartiendoId(null);
    } catch (err) {
      alert("No se pudo compartir el archivo.");
    }
    setLoading(false);
  };

  return (
    <div
      className={`fixed top-0 right-0 z-[10001] w-[94vw] max-w-[400px] h-full bg-white shadow-2xl border-l-2 border-[#b03a1a] transition-transform duration-300
      ${show ? "translate-x-0" : "translate-x-full"}`}
    >
      <div className="flex items-center justify-between px-4 py-3 bg-[#b03a1a] text-white rounded-t">
        <div className="flex items-center gap-2">
          <FolderOpen size={22} />
          <span className="font-bold">Archivos Analizados</span>
        </div>
        <button onClick={onClose}><X size={20} /></button>
      </div>
      <div className="p-3">
        <input
          type="text"
          placeholder="Buscar archivo o resumen..."
          className="w-full border rounded px-3 py-2 mb-2"
          value={filtro}
          onChange={e => setFiltro(e.target.value)}
        />
        <select
          className="w-full border rounded px-2 py-1 mb-3"
          value={expedienteSeleccionado}
          onChange={e => setExpedienteSeleccionado(e.target.value)}
        >
          <option value="">Todos los expedientes</option>
          {expedientes.map((num, i) => (
            <option value={num} key={i}>{num}</option>
          ))}
        </select>
        <div className="max-h-[75vh] overflow-y-auto pr-1">
          {archivosFiltrados.length === 0 ? (
            <div className="text-gray-400 py-8 text-center">No hay archivos analizados.</div>
          ) : (
            archivosFiltrados.map(a => (
              <div key={a.id} className="border-b py-2 mb-2">
                <div className="font-semibold text-[#b03a1a]">{a.archivoOriginalNombre}</div>
                <div className="text-xs text-gray-500 mb-1">
                  Expediente: <b>{a.expedienteNumero || "Sin expediente"}</b><br />
                  {new Date(a.fecha?.toDate ? a.fecha.toDate() : a.fecha).toLocaleString()}
                </div>
                <div className="text-xs max-h-[80px] overflow-y-auto bg-gray-50 rounded px-2 py-1 mb-1">{a.resumen?.slice(0, 250)}...</div>
                <div className="flex gap-2 mt-1">
                  <a
                    href={a.archivoAnalizadoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-blue-700 text-xs font-medium hover:underline"
                    title="Descargar resumen completo"
                  >
                    <Download size={14} /> Descargar
                  </a>
                  <button
                    className="flex items-center gap-1 text-red-600 text-xs font-medium hover:underline"
                    title="Borrar archivo"
                    onClick={() => borrarArchivo(a.id)}
                    disabled={loading}
                  >
                    <Trash2 size={14} /> Borrar
                  </button>
                  <button
                    className="flex items-center gap-1 text-gray-600 text-xs font-medium hover:underline"
                    title="Compartir archivo"
                    onClick={() => setCompartiendoId(a.id)}
                  >
                    <Share2 size={14} /> Compartir
                  </button>
                </div>
                {compartiendoId === a.id && (
                  <form
                    onSubmit={e => {
                      e.preventDefault();
                      compartirArchivo(a.id, emailCompartir);
                    }}
                    className="flex items-center gap-2 mt-2"
                  >
                    <input
                      type="email"
                      placeholder="Email del colega"
                      className="border px-2 py-1 rounded text-xs"
                      value={emailCompartir}
                      onChange={e => setEmailCompartir(e.target.value)}
                      required
                    />
                    <button
                      type="submit"
                      className="bg-[#b03a1a] text-white px-2 py-1 rounded text-xs"
                      disabled={loading}
                    >
                      Compartir
                    </button>
                    <button
                      type="button"
                      onClick={() => { setCompartiendoId(null); setEmailCompartir(""); }}
                      className="text-gray-500 text-xs"
                    >
                      Cancelar
                    </button>
                  </form>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
