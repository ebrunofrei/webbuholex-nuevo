import React, { useState, useEffect, useRef } from "react";
import { db, storage } from "../../services/firebaseConfig";
import {
  doc, getDoc, updateDoc, collection, addDoc, getDocs, serverTimestamp,
} from "firebase/firestore";
import {
  ref, uploadBytesResumable, getDownloadURL, deleteObject,
} from "firebase/storage";
import Tesseract from "tesseract.js";
import * as chrono from "chrono-node";
import AgendaVisual from "./AgendaVisual";

// ----------- COMPONENTES UI PEQUEÑOS
function CampoEditable({ label, value, onChange, tipo = "text" }) {
  const [edit, setEdit] = useState(false);
  const [temp, setTemp] = useState(value || "");
  useEffect(() => setTemp(value || ""), [value]);
  return (
    <div className="mb-3">
      <span className="font-semibold text-base text-black">{label}:</span>{" "}
      {edit ? (
        <input
          type={tipo}
          value={temp}
          onChange={e => setTemp(e.target.value)}
          onBlur={() => { setEdit(false); onChange(temp); }}
          onKeyDown={e => e.key === "Enter" && (setEdit(false), onChange(temp))}
          autoFocus
          className="border border-gray-300 rounded px-2 py-1 text-black"
        />
      ) : (
        <span
          className="cursor-pointer text-black px-1 hover:bg-yellow-100 rounded"
          onClick={() => setEdit(true)}
          title="Haz clic para editar"
        >
          {value || <span className="text-gray-400">[Vacío]</span>}
        </span>
      )}
    </div>
  );
}

function PartesProcesales({ partes = [], onChange }) {
  const agregar = () => onChange([...partes, ""]);
  const editar = (i, val) => onChange(partes.map((p, idx) => idx === i ? val : p));
  const quitar = (i) => onChange(partes.filter((_, idx) => idx !== i));
  return (
    <div className="mb-3">
      <span className="font-semibold text-base text-black">Partes procesales:</span>
      {partes.map((parte, i) => (
        <div key={i} className="flex gap-2 items-center mb-1">
          <input
            value={parte}
            onChange={e => editar(i, e.target.value)}
            className="border border-gray-300 rounded px-2 py-1 text-black"
          />
          <button onClick={() => quitar(i)} className="text-red-600 hover:text-red-900 font-bold" title="Eliminar">✖</button>
        </div>
      ))}
      <button
        onClick={agregar}
        className="bg-gray-200 hover:bg-gray-300 px-2 py-1 rounded text-sm font-semibold text-black"
      >+ Agregar parte</button>
    </div>
  );
}

// ----------- OCR y ANÁLISIS AVANZADO
async function extraerTextoOCR(file) {
  // Solo OCR a imágenes, si quieres PDF usa un servicio backend
  if (!file.type.match(/image/)) return "";
  return new Promise((resolve) => {
    Tesseract.recognize(file, "spa", { logger: () => {} })
      .then(({ data: { text } }) => resolve(text))
      .catch(() => resolve(""));
  });
}

function detectarFechasYPlazos(textoOCR) {
  const eventos = [];
  const results = chrono.casual.parse(textoOCR, new Date(), { forwardDate: true });
  results.forEach((r) => {
    eventos.push({
      fecha: r.start.date(),
      texto: r.text,
      contexto: r.text + " [" + (r.start.knownValues.day ? `${r.start.knownValues.day}/${r.start.knownValues.month}/${r.start.knownValues.year}` : "") + "]",
    });
  });
  const claves = [
    /audiencia/gi,
    /vista de causa/gi,
    /plazo de (\d+) días/gi,
    /notificación/gi,
    /sentencia/gi,
    /presentar escrito/gi,
    /alegato/gi,
    /cumplimiento/gi,
    /impugnar/gi,
    /apelación/gi,
    /prueba/gi,
    /diligencia/gi,
    /remate/gi,
  ];
  claves.forEach((rgx) => {
    let match;
    while ((match = rgx.exec(textoOCR)) !== null) {
      eventos.push({
        fecha: null,
        texto: match[0],
        contexto: textoOCR.substring(Math.max(0, match.index - 30), match.index + 30),
      });
    }
  });
  return eventos;
}

// ----------- PRINCIPAL
export default function ExpedienteEditable({ expedienteId, googleToken }) {
  const [exp, setExp] = useState(null);
  const [archivos, setArchivos] = useState([]);
  const [subiendo, setSubiendo] = useState(false);
  const [progreso, setProgreso] = useState(0);
  const inputRef = useRef();

  useEffect(() => {
    if (!expedienteId) return;
    getDoc(doc(db, "expedientes", expedienteId)).then((snap) => {
      setExp(snap.exists() ? { id: snap.id, ...snap.data() } : null);
    });
    getDocs(collection(db, "expedientes", expedienteId, "archivos")).then(snap => {
      setArchivos(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
  }, [expedienteId]);

  // Guardado inmediato
  const updateCampo = (campo, valor) => {
    setExp((exp) => ({ ...exp, [campo]: valor }));
    updateDoc(doc(db, "expedientes", expedienteId), { [campo]: valor });
  };
  const updatePartes = (partes) => updateCampo("partes", partes);

  // --- Subida de archivos + OCR + Análisis legal + Agenda + Google Calendar
  const handleArchivo = async (files) => {
    if (!files.length) return;
    setSubiendo(true);
    for (const archivo of files) {
      await subirArchivo(archivo);
    }
    setSubiendo(false);
    getDocs(collection(db, "expedientes", expedienteId, "archivos")).then(snap => {
      setArchivos(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
  };

  async function agregarEventoGoogleCalendar(accessToken, evento) {
    if (!accessToken) return;
    try {
      const res = await fetch(
        "https://www.googleapis.com/calendar/v3/calendars/primary/events",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            summary: evento.titulo,
            description: evento.resumen || "",
            start: { dateTime: new Date(evento.fecha).toISOString() },
            end: { dateTime: new Date(new Date(evento.fecha).getTime() + 60 * 60 * 1000).toISOString() }
          })
        }
      );
      if (!res.ok) throw new Error("Error al crear evento en Google Calendar");
      return await res.json();
    } catch (err) { /* Maneja error si falla */ }
  }

  const subirArchivo = (archivo) =>
    new Promise((resolve, reject) => {
      const ruta = `expedientes/${expedienteId}/${Date.now()}_${archivo.name}`;
      const storageRef = ref(storage, ruta);
      const uploadTask = uploadBytesResumable(storageRef, archivo);

      uploadTask.on(
        "state_changed",
        (snapshot) => setProgreso(Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100)),
        (error) => { alert("Error al subir: " + error.message); setProgreso(0); reject(); },
        async () => {
          const url = await getDownloadURL(uploadTask.snapshot.ref);
          let textoOCR = "";
          if (archivo.type.match(/image/)) {
            textoOCR = await extraerTextoOCR(archivo);
          }
          const refArch = await addDoc(collection(db, "expedientes", expedienteId, "archivos"), {
            nombre: archivo.name, url, tipo: archivo.type, tamaño: archivo.size, fecha: serverTimestamp(),
            user: exp?.responsable || "Desconocido", expedienteId, textoOCR,
          });
          // ---- ANÁLISIS AVANZADO + GOOGLE CALENDAR
          const eventosDetectados = detectarFechasYPlazos(textoOCR);
          for (const ev of eventosDetectados) {
            await addDoc(collection(db, "expedientes", expedienteId, "agenda"), {
              titulo: ev.texto,
              evento: ev.texto,
              fecha: ev.fecha ? ev.fecha.toISOString() : null,
              resumen: ev.contexto,
              creadoEn: serverTimestamp(),
              fuente: "bot"
            });
            // Google Calendar automático si user lo permite y hay fecha
            if (googleToken && ev.fecha) {
              await agregarEventoGoogleCalendar(googleToken, {
                titulo: ev.texto || "Evento automático (BúhoLex)",
                fecha: ev.fecha,
                resumen: ev.contexto,
              });
            }
            // Aquí puedes disparar notificación push (ver guía siguiente)
          }
          setProgreso(0);
          resolve();
        }
      );
    });

  const onDrop = (e) => { e.preventDefault(); if (subiendo) return; handleArchivo(e.dataTransfer.files); };
  const onFileChange = (e) => { handleArchivo(e.target.files); };

  if (!exp) return <div className="p-8 text-center text-gray-600">Cargando expediente...</div>;

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <button className="mb-4 bg-gray-200 hover:bg-gray-300 px-3 py-1 rounded font-semibold text-black" onClick={() => window.history.back()}>
        ← Regresar a mis expedientes
      </button>

      <div className="mb-2">
        <CampoEditable label="Número y año" value={exp.numero || ""} onChange={v => updateCampo("numero", v)} />
        <CampoEditable label="Juzgado" value={exp.juzgado || ""} onChange={v => updateCampo("juzgado", v)} />
        <CampoEditable label="Materia" value={exp.materia || ""} onChange={v => updateCampo("materia", v)} />
        <PartesProcesales partes={exp.partes || []} onChange={updatePartes} />
        <CampoEditable label="Secretario/Especialista" value={exp.secretario || ""} onChange={v => updateCampo("secretario", v)} />
        <CampoEditable label="Seguimiento / Última notificación" value={exp.seguimiento || ""} onChange={v => updateCampo("seguimiento", v)} />
      </div>

      <h3 className="font-bold text-lg text-black mt-4 mb-2">Archivos del expediente</h3>
      <div
        className={`border-dashed border-2 rounded-2xl p-8 mb-4 text-black text-center bg-white transition-all cursor-pointer ${
          subiendo ? "opacity-50" : "hover:bg-gray-100"
        }`}
        onDrop={onDrop}
        onDragOver={e => e.preventDefault()}
        onClick={() => !subiendo && inputRef.current.click()}
        title="Arrastra aquí o haz clic para subir archivos"
      >
        {subiendo
          ? <span>Subiendo archivo... <span className="font-bold">{progreso}%</span></span>
          : <span className="font-semibold">Arrastra aquí tus archivos PDF, Office, imágenes o haz click para seleccionar</span>
        }
        <input
          type="file"
          multiple
          className="hidden"
          ref={inputRef}
          onChange={onFileChange}
          disabled={subiendo}
          accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.png"
        />
      </div>

      <div className="space-y-2">
        {archivos.length === 0 && (
          <div className="text-sm text-gray-400">No hay archivos aún en este expediente.</div>
        )}
        {archivos.map(archivo => (
          <ArchivoCard key={archivo.id} archivo={archivo} onEliminar={async (a) => {
            if (window.confirm(`¿Eliminar archivo "${a.nombre}"?`)) {
              await deleteObject(ref(storage, decodeURIComponent(a.url.split("/o/")[1].split("?alt=")[0])));
              setArchivos(archivos.filter(ax => ax.id !== a.id));
            }
          }} />
        ))}
      </div>

      {/* PANEL DE AGENDA / ALERTAS */}
      <AgendaVisual expedienteId={expedienteId} />
    </div>
  );
}

function ArchivoCard({ archivo, onEliminar }) {
  return (
    <div className="flex items-center justify-between bg-white rounded-xl shadow p-3">
      <div className="flex items-center space-x-3">
        <span className="text-2xl">
          {archivo.tipo?.includes("pdf") ? "📄" :
           archivo.tipo?.includes("word") ? "📝" :
           archivo.tipo?.includes("image") ? "🖼️" : "📁"}
        </span>
        <span className="font-medium text-black" title={archivo.nombre}>{archivo.nombre}</span>
        <span className="text-xs text-gray-400 ml-2">
          {archivo.fecha?.seconds && new Date(archivo.fecha.seconds * 1000).toLocaleString()}
        </span>
      </div>
      <div className="flex items-center space-x-2">
        <a
          href={archivo.url}
          download={archivo.nombre}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:underline text-sm"
        >Descargar</a>
        <button
          className="text-red-500 hover:text-red-700 text-sm"
          onClick={() => onEliminar(archivo)}
        >Eliminar</button>
      </div>
    </div>
  );
}
