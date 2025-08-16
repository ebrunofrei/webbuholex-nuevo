import React, { useRef, useState } from "react";
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  doc,
  setDoc,
  query,
  orderBy,
  getDocs,
} from "firebase/firestore";
import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
  uploadBytes,
} from "firebase/storage";
import { db, storage } from "../../services/firebaseConfig";
import { ArrowDownToLine, Trash2, Edit3, Plus, Loader2 } from "lucide-react";

export default function TabDocumentos({ expedienteId }) {
  const [archivos, setArchivos] = useState([]);
  const [subiendo, setSubiendo] = useState(false);
  const [progreso, setProgreso] = useState(0);
  const [loading, setLoading] = useState(true);
  const inputRef = useRef();

  // Cargar archivos al montar
  React.useEffect(() => {
    if (!expedienteId) return;
    setLoading(true);
    const cargarArchivos = async () => {
      const q = query(
        collection(db, "expedientes", expedienteId, "archivos"),
        orderBy("fecha", "desc")
      );
      const snap = await getDocs(q);
      setArchivos(
        snap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
      );
      setLoading(false);
    };
    cargarArchivos();
  }, [expedienteId, subiendo]);

  // Subida de archivos tipo Drive
  const handleArchivo = async (files) => {
    if (!files.length) return;
    setSubiendo(true);
    for (const archivo of files) {
      await subirArchivo(archivo);
    }
    setSubiendo(false);
  };

  const subirArchivo = (archivo) =>
    new Promise((resolve, reject) => {
      const ruta = `expedientes/${expedienteId}/${Date.now()}_${archivo.name}`;
      const storageRef = ref(storage, ruta);
      const uploadTask = uploadBytesResumable(storageRef, archivo);

      uploadTask.on(
        "state_changed",
        (snapshot) => {
          setProgreso(
            Math.round(
              (snapshot.bytesTransferred / snapshot.totalBytes) * 100
            )
          );
        },
        (error) => {
          setProgreso(0);
          reject();
        },
        async () => {
          const url = await getDownloadURL(uploadTask.snapshot.ref);
          await addDoc(collection(db, "expedientes", expedienteId, "archivos"), {
            nombre: archivo.name,
            url,
            tipo: archivo.type,
            tamaño: archivo.size,
            fecha: serverTimestamp(),
            expedienteId,
          });
          setProgreso(0);
          resolve();
        }
      );
    });

  const handleRenombrar = async (id, nuevoNombre) => {
    await updateDoc(
      doc(db, "expedientes", expedienteId, "archivos", id),
      { nombre: nuevoNombre }
    );
    setArchivos((prev) =>
      prev.map((a) => (a.id === id ? { ...a, nombre: nuevoNombre } : a))
    );
  };

  const handleEliminar = async (archivo) => {
    if (
      !window.confirm(
        `¿Seguro que deseas eliminar el archivo "${archivo.nombre}"? Se guardará un respaldo antes.`
      )
    )
      return;

    // Backup en Firestore y Storage
    await setDoc(
      doc(db, "expedientes_eliminados", expedienteId + "_" + archivo.id),
      {
        ...archivo,
        expedienteId,
        eliminadoEn: new Date().toISOString(),
        motivo: "Eliminado por user",
      }
    );

    try {
      const response = await fetch(archivo.url);
      const blob = await response.blob();
      const backupRef = ref(
        storage,
        `expedientes_eliminados/${expedienteId}/${archivo.nombre}`
      );
      await uploadBytes(backupRef, blob);
    } catch (err) {}

    try {
      const fileRef = ref(
        storage,
        decodeURIComponent(archivo.url.split("/o/")[1].split("?alt=")[0])
      );
      await deleteObject(fileRef);
    } catch (e) {}

    await deleteDoc(
      doc(db, "expedientes", expedienteId, "archivos", archivo.id)
    );
    setArchivos((prev) => prev.filter((a) => a.id !== archivo.id));
  };

  const onDrop = (e) => {
    e.preventDefault();
    if (subiendo) return;
    handleArchivo(e.dataTransfer.files);
  };

  const onFileChange = (e) => {
    handleArchivo(e.target.files);
  };

  return (
    <div>
      <div className="mb-3 flex items-center gap-3">
        <button
          className="bg-[#a52e00] hover:bg-[#b03a1a] text-white rounded-full p-3 shadow transition"
          title="Subir archivos"
          disabled={subiendo}
          onClick={() => inputRef.current?.click()}
        >
          <Plus size={22} />
        </button>
        <span className="text-gray-500 text-sm">
          {subiendo ? "Subiendo..." : "Sube, arrastra o gestiona tus documentos PDF, Word, imágenes..."}
        </span>
      </div>

      <div
        className={`border-2 border-dashed rounded-xl p-8 mb-6 text-gray-400 text-center bg-white transition-all cursor-pointer ${
          subiendo ? "opacity-50" : "hover:bg-gray-100"
        }`}
        onDrop={onDrop}
        onDragOver={e => e.preventDefault()}
        onClick={() => !subiendo && inputRef.current?.click()}
        style={{ minHeight: 80 }}
      >
        {subiendo
          ? <span className="animate-pulse flex items-center justify-center gap-2"><Loader2 className="animate-spin" /> Subiendo archivo...</span>
          : "Arrastra aquí tus archivos o haz click para seleccionar"}
        <input
          type="file"
          multiple
          className="hidden"
          ref={inputRef}
          onChange={onFileChange}
          disabled={subiendo}
        />
      </div>

      {subiendo && progreso > 0 && (
        <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
          <div
            className="bg-[#b03a1a] h-3 rounded-full transition-all"
            style={{ width: `${progreso}%` }}
          ></div>
        </div>
      )}

      {loading ? (
        <div className="text-gray-400 flex gap-2 items-center animate-pulse"><Loader2 className="animate-spin" />Cargando archivos...</div>
      ) : (
        <div className="space-y-3">
          {archivos.length === 0 && (
            <div className="text-sm text-gray-400">
              No hay archivos aún en este expediente.
            </div>
          )}
          {archivos.map((archivo) => (
            <ArchivoCard
              key={archivo.id}
              archivo={archivo}
              onRenombrar={handleRenombrar}
              onEliminar={handleEliminar}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ArchivoCard({ archivo, onRenombrar, onEliminar }) {
  const [editando, setEditando] = useState(false);
  const [nuevoNombre, setNuevoNombre] = useState(archivo.nombre);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (nuevoNombre && nuevoNombre !== archivo.nombre) {
      onRenombrar(archivo.id, nuevoNombre);
    }
    setEditando(false);
  };

  // Ícono según tipo de archivo
  const icono =
    archivo.tipo?.includes("pdf")
      ? <span className="text-red-700">📄</span>
      : archivo.tipo?.includes("word")
      ? <span className="text-blue-700">📝</span>
      : archivo.tipo?.includes("image")
      ? <span className="text-yellow-700">🖼️</span>
      : <span className="text-gray-700">📁</span>;

  return (
    <div className="flex items-center justify-between bg-white rounded-xl shadow p-3 hover:shadow-md">
      <div className="flex items-center gap-3">
        {icono}
        {editando ? (
          <form onSubmit={handleSubmit} className="flex items-center gap-2">
            <input
              type="text"
              className="border rounded px-2 py-1 text-sm"
              value={nuevoNombre}
              onChange={e => setNuevoNombre(e.target.value)}
              autoFocus
              onBlur={() => setEditando(false)}
            />
            <button className="text-[#b03a1a] text-xs px-2 py-0.5 rounded hover:bg-[#fff6e6]">OK</button>
          </form>
        ) : (
          <span
            className="font-medium cursor-pointer"
            title={archivo.nombre}
            onClick={() => setEditando(true)}
          >
            {archivo.nombre}
          </span>
        )}
      </div>
      <div className="flex items-center gap-2">
        <a
          href={archivo.url}
          download={archivo.nombre}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center text-blue-700 hover:underline text-sm"
          title="Descargar"
        >
          <ArrowDownToLine size={18} />
        </a>
        <button
          className="flex items-center text-red-500 hover:text-red-700 text-sm"
          title="Eliminar"
          onClick={() => onEliminar(archivo)}
        >
          <Trash2 size={18} />
        </button>
        <button
          className="flex items-center text-[#b03a1a] hover:text-black text-sm"
          title="Renombrar"
          onClick={() => setEditando(true)}
        >
          <Edit3 size={16} />
        </button>
      </div>
    </div>
  );
}
