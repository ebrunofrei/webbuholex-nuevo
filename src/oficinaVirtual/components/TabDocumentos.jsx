import React, { useEffect, useRef, useState } from "react";
import {
  collection,
  query,
  orderBy,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  setDoc,
  doc
} from "firebase/firestore";
import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
  uploadBytes
} from "firebase/storage";
import { db, storage } from "@/firebase";
import ArchivoCard from "./ArchivoCard";
import GrabadoraVoz from "./GrabadoraVoz";
import ArchivoViewerModal from "./ArchivoViewerModal";
import VisorArchivoModal from "./VisorArchivoModal";
import AgendadorPlazos from "./AgendadorPlazos";
import ResumenExpediente from "./ResumenExpediente";
import { enviarTelegram } from "@/services/telegram";

export default function TabDocumentos({ expedienteId }) {
  const [archivoMadre, setArchivoMadre] = useState(null);
  const [resoluciones, setResoluciones] = useState([]);
  const [subiendo, setSubiendo] = useState(false);
  const [progreso, setProgreso] = useState(0);
  const [archivoActivo, setArchivoActivo] = useState(null);
  const [mostrarVisor, setMostrarVisor] = useState(false);
  const inputRef = useRef();

  useEffect(() => {
    if (!expedienteId) return;
    const cargarArchivos = async () => {
      const madreSnap = await getDocs(collection(db, "expedientes", expedienteId, "archivo_madre"));
      const madre = madreSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }))[0];
      setArchivoMadre(madre);

      const resolSnap = await getDocs(query(collection(db, "expedientes", expedienteId, "resoluciones"), orderBy("fecha", "desc")));
      setResoluciones(resolSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    };
    cargarArchivos();
  }, [expedienteId, subiendo]);

  const subirArchivo = (archivo, tipo = "resolucion", subtipo = "") =>
    new Promise(async (resolve, reject) => {
      const ruta = `expedientes/${expedienteId}/${tipo}/${Date.now()}_${archivo.name}`;
      const storageRef = ref(storage, ruta);
      const uploadTask = uploadBytesResumable(storageRef, archivo);

      uploadTask.on(
        "state_changed",
        (snapshot) => {
          setProgreso(Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100));
        },
        (error) => {
          setProgreso(0);
          reject();
        },
        async () => {
          const url = await getDownloadURL(uploadTask.snapshot.ref);
          const docRef = tipo === "madre"
            ? collection(db, "expedientes", expedienteId, "archivo_madre")
            : collection(db, "expedientes", expedienteId, "resoluciones");

          await addDoc(docRef, {
            nombre: archivo.name,
            url,
            tipo: archivo.type,
            tamaño: archivo.size,
            subtipo,
            fecha: serverTimestamp(),
            expedienteId,
          });

          setProgreso(0);
          await enviarTelegram(`📎 Archivo <b>${archivo.name}</b> subido al expediente <b>${expedienteId}</b>`);
          resolve();
        }
      );
    });

  const handleArchivo = async (files) => {
    if (!files.length) return;
    setSubiendo(true);

    for (const archivo of files) {
      const extension = archivo.name.toLowerCase();
      if (archivoMadre === undefined && extension.includes("madre")) {
        await subirArchivo(archivo, "madre");
      } else if (extension.includes("auto")) {
        await subirArchivo(archivo, "resolucion", "auto");
      } else if (extension.includes("decreto")) {
        await subirArchivo(archivo, "resolucion", "decreto");
      } else if (extension.includes("sentencia")) {
        await subirArchivo(archivo, "resolucion", "sentencia");
      } else {
        await subirArchivo(archivo, "resolucion", "otros");
      }
    }
    setSubiendo(false);
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
      <ResumenExpediente expedienteId={expedienteId} />

      <div
        className={`border-2 border-dashed rounded-xl p-8 mb-6 text-gray-400 text-center bg-white transition-all cursor-pointer ${subiendo ? "opacity-50" : "hover:bg-gray-100"}`}
        onDrop={onDrop}
        onDragOver={e => e.preventDefault()}
        onClick={() => !subiendo && inputRef.current?.click()}
        style={{ minHeight: 100 }}
      >
        {subiendo ? "Subiendo archivo..." : "Arrastra aquí tus archivos o haz click para seleccionar"}
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

      {archivoMadre && (
        <div className="mb-6">
          <h3 className="text-md font-bold text-[#b03a1a] mb-2">Archivo Madre:</h3>
          <ArchivoCard archivo={archivoMadre} soloLectura onVer={(archivo) => {
            setArchivoActivo(archivo);
            setMostrarVisor(true);
          }} />
        </div>
      )}

      <div className="mb-6">
        <h3 className="text-md font-bold text-[#b03a1a] mb-2">Resoluciones:</h3>
        {resoluciones.length === 0 ? (
          <p className="text-sm text-gray-400">No hay resoluciones aún.</p>
        ) : (
          resoluciones.map((archivo) => (
            <ArchivoCard
              key={archivo.id}
              archivo={archivo}
              tipo={archivo.subtipo}
              onVer={(archivo) => {
                setArchivoActivo(archivo);
                setMostrarVisor(true);
              }}
              onRenombrar={() => {}}
              onEliminar={() => {}}
            />
          ))
        )}
      </div>

      <AgendadorPlazos expedienteId={expedienteId} />

      <div className="my-8">
        <GrabadoraVoz />
      </div>

      {mostrarVisor && archivoActivo && (
        <VisorArchivoModal
          open={mostrarVisor}
          onClose={() => setMostrarVisor(false)}
          archivo={archivoActivo}
          expediente={expedienteId}
          archivosEnCarpeta={[...resoluciones, archivoMadre].filter(Boolean).map(a => ({
            ...a,
            name: a.nombre,
            onPreview: () => {
              setArchivoActivo(a);
              setMostrarVisor(true);
            }
          }))}
        />
      )}
    </div>
  );
}
