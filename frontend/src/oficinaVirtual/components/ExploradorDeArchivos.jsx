import React, { useEffect, useRef, useState } from "react";
import {
  ref,
  listAll,
  getDownloadURL,
  deleteObject,
  uploadBytesResumable,
} from "firebase/storage";
import { storage } from "../../services/firebaseConfig";
import VisorArchivoModal from "./VisorArchivoModal";

const carpetas = ["documentos", "alegatos", "archivados"];

export default function ExploradorDeArchivos({ expedienteId = "00198-2025" }) {
  const [archivosPorCarpeta, setArchivosPorCarpeta] = useState({});
  const [expanded, setExpanded] = useState({});
  const [uploading, setUploading] = useState({});
  const inputRefs = useRef({});
  const [archivoPreview, setArchivoPreview] = useState(null);
  const [carpetaActual, setCarpetaActual] = useState(null);

  // Cargar archivos al montar o cambiar expediente
  useEffect(() => {
    carpetas.forEach(async (carpeta) => {
      const pathRef = ref(storage, `expedientes/${expedienteId}/${carpeta}`);
      const res = await listAll(pathRef);
      const archivos = await Promise.all(
        res.items.map(async (item) => {
          const url = await getDownloadURL(item);
          return { name: item.name, url, ref: item };
        })
      );
      setArchivosPorCarpeta((prev) => ({ ...prev, [carpeta]: archivos }));
    });
  }, [expedienteId]);

  const toggleExpand = (carpeta) => {
    setExpanded((prev) => ({ ...prev, [carpeta]: !prev[carpeta] }));
  };

  // Subida masiva (batch)
  const handleFileUpload = (e, carpeta) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    files.forEach((file) => {
      const storageRef = ref(storage, `expedientes/${expedienteId}/${carpeta}/${file.name}`);
      const uploadTask = uploadBytesResumable(storageRef, file);

      setUploading((prev) => ({
        ...prev,
        [`${carpeta}-${file.name}`]: { progress: 0, file }
      }));

      uploadTask.on(
        "state_changed",
        (snapshot) => {
          const percent = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setUploading((prev) => ({
            ...prev,
            [`${carpeta}-${file.name}`]: { progress: percent.toFixed(0), file }
          }));
        },
        (error) => {
          console.error("Error al subir:", error);
        },
        async () => {
          const url = await getDownloadURL(uploadTask.snapshot.ref);
          setArchivosPorCarpeta((prev) => ({
            ...prev,
            [carpeta]: [...(prev[carpeta] || []), { name: file.name, url, ref: storageRef }],
          }));
          setUploading((prev) => {
            const newUploading = { ...prev };
            delete newUploading[`${carpeta}-${file.name}`];
            return newUploading;
          });
        }
      );
    });
    e.target.value = "";
  };

  const handleEliminar = async (archivo, carpeta) => {
    if (window.confirm(`¿Deseas eliminar "${archivo.name}"?`)) {
      await deleteObject(archivo.ref);
      setArchivosPorCarpeta((prev) => ({
        ...prev,
        [carpeta]: prev[carpeta].filter((a) => a.name !== archivo.name),
      }));
    }
  };

  // Vista previa según tipo
  const renderVistaPrevia = (archivo) => {
    const ext = archivo.name.split('.').pop().toLowerCase();
    if (["png", "jpg", "jpeg", "gif"].includes(ext)) {
      return <img src={archivo.url} alt={archivo.name} className="w-12 h-12 object-cover rounded border" />;
    }
    if (ext === "pdf") {
      return (
        <span className="text-2xl text-red-600">📄</span>
      );
    }
    if (["doc", "docx"].includes(ext)) {
      return <span className="text-blue-700 text-2xl">📝</span>;
    }
    return <span className="text-gray-400 text-2xl">📄</span>;
  };

  return (
    <div className="space-y-6">
      {carpetas.map((carpeta) => (
        <div key={carpeta} className="border rounded-md p-4 bg-white shadow">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-bold text-gray-700">
              📁 {carpeta.charAt(0).toUpperCase() + carpeta.slice(1)}
            </h2>
            <div className="flex items-center gap-2">
              <input
                ref={el => inputRefs.current[carpeta] = el}
                type="file"
                onChange={e => handleFileUpload(e, carpeta)}
                className="hidden"
                multiple
              />
              <button
                className="text-blue-600 hover:underline"
                onClick={() => inputRefs.current[carpeta]?.click()}
              >
                📤 Subir archivos
              </button>
              <button
                onClick={() => toggleExpand(carpeta)}
                className="text-sm bg-red-600 text-white px-2 py-1 rounded hover:bg-red-700"
              >
                {expanded[carpeta] ? "Ocultar" : "Mostrar"}
              </button>
            </div>
          </div>

          {/* Progreso masivo */}
          {Object.keys(uploading)
            .filter(key => key.startsWith(carpeta))
            .map(key => (
              <div key={key} className="mt-1 text-blue-600 text-sm">
                {uploading[key].file.name}: {uploading[key].progress}%
              </div>
            ))}

          {expanded[carpeta] && archivosPorCarpeta[carpeta]?.length > 0 && (
            <ul className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-2">
              {archivosPorCarpeta[carpeta].map((archivo, idx) => (
                <li
                  key={idx}
                  className="flex items-center gap-3 bg-gray-50 border rounded px-2 py-1"
                >
                  {renderVistaPrevia(archivo)}
                  <div className="flex-1 ml-2">
                    <span
                      onClick={() => {
                        setArchivoPreview(archivo);
                        setCarpetaActual(carpeta);
                      }}
                      className="text-blue-700 hover:underline font-semibold block truncate cursor-pointer"
                    >
                      {archivo.name}
                    </span>
                    <div className="space-x-2 text-xs">
                      <a href={archivo.url} download className="text-green-600 hover:underline">⬇️ Descargar</a>
                      <button
                        onClick={() => handleEliminar(archivo, carpeta)}
                        className="text-red-500 hover:underline"
                      >
                        🗑️ Eliminar
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
          {expanded[carpeta] && archivosPorCarpeta[carpeta]?.length === 0 && (
            <p className="text-sm text-gray-500 mt-2">No hay archivos aún.</p>
          )}
        </div>
      ))}
      {/* Modal visor avanzado */}
      {archivoPreview && (
        <VisorArchivoModal
          open={!!archivoPreview}
          archivo={{
            ...archivoPreview,
            onPreview: (nuevo) => setArchivoPreview(nuevo || archivoPreview),
          }}
          archivosEnCarpeta={
            archivosPorCarpeta[carpetaActual]?.map((a) => ({
              ...a,
              onPreview: () => setArchivoPreview(a),
            })) || []
          }
          onClose={() => setArchivoPreview(null)}
        />
      )}
    </div>
  );
}
