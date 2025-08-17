import React, { useState, useRef, useEffect } from "react";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { db, storage } from "../../services/firebaseConfig";

const MAX_FILE_MB = 25;

export default function CrearExpediente({ onCreado }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    numero: "",
    materia: "",
    año: new Date().getFullYear(),
    cliente: "",
    juzgado: "",
    responsable: ""
  });
  const [demanda, setDemanda] = useState(null);
  const [resoluciones, setResoluciones] = useState([]);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [progreso, setProgreso] = useState({ done: 0, total: 0 });
  const [archivosResueltos, setArchivosResueltos] = useState([]);
  const [showAnalizar, setShowAnalizar] = useState(false);

  const demandaRef = useRef();
  const resolRef = useRef();

  // Prevenir cerrar ventana mientras sube archivos
  useEffect(() => {
    const beforeUnload = e => {
      if (guardando) {
        e.preventDefault();
        e.returnValue = "La carga de archivos no ha terminado.";
        return e;
      }
    };
    if (guardando) window.addEventListener("beforeunload", beforeUnload);
    else window.removeEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, [guardando]);

  const abrir = () => setOpen(true);
  const cerrar = () => {
    setOpen(false);
    setForm({
      numero: "",
      materia: "",
      año: new Date().getFullYear(),
      cliente: "",
      juzgado: "",
      responsable: ""
    });
    setDemanda(null);
    setResoluciones([]);
    setError("");
    setProgreso({ done: 0, total: 0 });
    setArchivosResueltos([]);
    setShowAnalizar(false);
  };

  const handleChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  // DEMANDA: archivo único obligatorio
  const handleDemanda = e => {
    setDemanda(e.target.files[0] || null);
  };

  // RESOLUCIONES: múltiples archivos opcionales
  const handleResoluciones = e => {
    setResoluciones(Array.from(e.target.files));
  };

  // Analizar con LitisBot (evento global)
  const analizarConLitisBot = archivo => {
    window.dispatchEvent(
      new CustomEvent("analizarLitisBot", { detail: archivo })
    );
    alert("El archivo fue enviado a LitisBot para análisis automático.");
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setError("");
    // Validación de campos obligatorios
    if (!form.numero || !form.materia || !form.cliente) {
      setError("Llena al menos número, materia y cliente.");
      return;
    }
    if (!demanda) {
      setError("Debes subir la demanda, denuncia o escrito inicial.");
      return;
    }
    // Validar tamaño archivos
    if (demanda.size > MAX_FILE_MB * 1024 * 1024) {
      setError(`Demanda demasiado pesada (máx ${MAX_FILE_MB} MB).`);
      return;
    }
    if (resoluciones.some(a => a.size > MAX_FILE_MB * 1024 * 1024)) {
      setError(`Alguna resolución/notificación supera los ${MAX_FILE_MB} MB.`);
      return;
    }
    setGuardando(true);
    setProgreso({ done: 0, total: 1 + resoluciones.length });

    let archivosResolTemp = [];
    try {
      // 1. Crear expediente vacío
      const docRef = await addDoc(collection(db, "expedientes"), {
        ...form,
        estado: "Activo",
        creadoEn: serverTimestamp(),
      });

      // 2. Subir demanda/denuncia
      await new Promise((resolve, reject) => {
        const ruta = `expedientes/${docRef.id}/demanda_${Date.now()}_${demanda.name}`;
        const storageRef = ref(storage, ruta);
        const uploadTask = uploadBytesResumable(storageRef, demanda);
        uploadTask.on(
          "state_changed",
          snap => setProgreso(pr => ({ ...pr, done: pr.done })),
          reject,
          async () => {
            const url = await getDownloadURL(uploadTask.snapshot.ref);
            await addDoc(collection(db, "expedientes", docRef.id, "archivos"), {
              nombre: demanda.name,
              url,
              tipo: demanda.type,
              tamaño: demanda.size,
              fecha: serverTimestamp(),
              expedienteId: docRef.id,
              categoria: "Demanda/Denuncia"
            });
            setProgreso(pr => ({ ...pr, done: pr.done + 1 }));
            resolve();
          }
        );
      });

      // 3. Subir resoluciones/notificaciones EN PARALELO
      await Promise.all(resoluciones.map((resol, idx) =>
        new Promise((resolve, reject) => {
          const ruta = `expedientes/${docRef.id}/resoluciones/${Date.now()}_${idx}_${resol.name}`;
          const storageRef = ref(storage, ruta);
          const uploadTask = uploadBytesResumable(storageRef, resol);
          uploadTask.on(
            "state_changed",
            snap => {}, // Se podría mejorar para ver progreso por archivo
            reject,
            async () => {
              const url = await getDownloadURL(uploadTask.snapshot.ref);
              await addDoc(collection(db, "expedientes", docRef.id, "archivos"), {
                nombre: resol.name,
                url,
                tipo: resol.type,
                tamaño: resol.size,
                fecha: serverTimestamp(),
                expedienteId: docRef.id,
                categoria: "Resolución/Notificación"
              });
              archivosResolTemp.push({
                nombre: resol.name,
                url,
                tipo: resol.type,
                expedienteId: docRef.id
              });
              setProgreso(pr => ({ ...pr, done: pr.done + 1 }));
              resolve();
            }
          );
        })
      ));

      if (onCreado) onCreado({ ...form, id: docRef.id });
      setArchivosResueltos(archivosResolTemp);
      setShowAnalizar(archivosResolTemp.length > 0);
      if (archivosResolTemp.length === 0) cerrar();
    } catch (err) {
      setError("Error al guardar. Intenta nuevamente.");
      setGuardando(false);
      return;
    }
    setGuardando(false);
  };

  return (
    <>
      {/* BOTÓN flotante */}
      <button
        onClick={abrir}
        className="fixed bottom-8 right-8 bg-[#b03a1a] text-white rounded-full w-16 h-16 shadow-xl text-4xl flex items-center justify-center hover:bg-[#a52e00] z-50"
        title="Crear expediente virtual"
      >
        +
      </button>
      {/* MODAL CREAR */}
      {open && !showAnalizar && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center">
          <form
            className="bg-white rounded-xl p-8 w-full max-w-md shadow-lg relative"
            onSubmit={handleSubmit}
          >
            <button type="button" className="absolute top-2 right-3 text-2xl text-[#b03a1a]" onClick={cerrar}>×</button>
            <h2 className="text-2xl font-bold mb-4 text-[#b03a1a]">Nuevo Expediente</h2>
            <div className="mb-2">
              <label className="font-semibold">N° Expediente*</label>
              <input
                name="numero"
                className="border rounded w-full p-2 mt-1"
                placeholder="Ej: 2024-01234"
                value={form.numero}
                onChange={handleChange}
                required
              />
            </div>
            <div className="mb-2">
              <label className="font-semibold">Materia*</label>
              <input
                name="materia"
                className="border rounded w-full p-2 mt-1"
                placeholder="Ej: Civil, Penal, Laboral"
                value={form.materia}
                onChange={handleChange}
                required
              />
            </div>
            <div className="mb-2">
              <label className="font-semibold">Año</label>
              <input
                name="año"
                type="number"
                className="border rounded w-full p-2 mt-1"
                value={form.año}
                onChange={handleChange}
                min={2000}
                max={2099}
              />
            </div>
            <div className="mb-2">
              <label className="font-semibold">Cliente/Parte*</label>
              <input
                name="cliente"
                className="border rounded w-full p-2 mt-1"
                value={form.cliente}
                onChange={handleChange}
                required
              />
            </div>
            <div className="mb-2">
              <label className="font-semibold">Juzgado/Sala</label>
              <input
                name="juzgado"
                className="border rounded w-full p-2 mt-1"
                value={form.juzgado}
                onChange={handleChange}
              />
            </div>
            <div className="mb-4">
              <label className="font-semibold">Responsable</label>
              <input
                name="responsable"
                className="border rounded w-full p-2 mt-1"
                value={form.responsable}
                onChange={handleChange}
              />
            </div>
            {/* DEMANDA / DENUNCIA */}
            <div className="mb-4">
              <label className="font-semibold">Demanda / Denuncia (obligatorio, máx {MAX_FILE_MB} MB)</label>
              <input
                type="file"
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                className="block w-full border rounded mt-1"
                onChange={handleDemanda}
                ref={demandaRef}
                disabled={guardando}
                required
              />
              {demanda && (
                <div className="text-xs mt-1 text-[#b03a1a]">
                  📄 {demanda.name} ({(demanda.size/1024/1024).toFixed(1)} MB)
                </div>
              )}
            </div>
            {/* RESOLUCIONES / NOTIFICACIONES */}
            <div className="mb-4">
              <label className="font-semibold">Notificaciones y resoluciones (opcional, puedes agregar varias, máx {MAX_FILE_MB} MB c/u)</label>
              <input
                type="file"
                multiple
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                className="block w-full border rounded mt-1"
                onChange={handleResoluciones}
                ref={resolRef}
                disabled={guardando}
              />
              {resoluciones.length > 0 && (
                <ul className="text-xs mt-2">
                  {resoluciones.map((a, i) => (
                    <li key={i}>
                      📑 {a.name} ({(a.size/1024/1024).toFixed(1)} MB)
                    </li>
                  ))}
                </ul>
              )}
            </div>
            {guardando && (
              <div className="mb-4 text-[#b03a1a] font-semibold">
                Subiendo archivos... ({progreso.done} de {progreso.total})
                <div className="w-full bg-gray-200 rounded-full h-3 mt-1">
                  <div
                    className="bg-[#b03a1a] h-3 rounded-full transition-all"
                    style={{ width: `${Math.round((progreso.done/progreso.total)*100)}%` }}
                  ></div>
                </div>
              </div>
            )}
            {error && <div className="mb-2 text-red-600">{error}</div>}
            <button
              type="submit"
              className="bg-[#b03a1a] text-white px-6 py-2 rounded w-full font-semibold hover:bg-[#a52e00] transition"
              disabled={guardando}
            >
              {guardando ? "Guardando..." : "Crear expediente"}
            </button>
          </form>
        </div>
      )}

      {/* MODAL de análisis inmediato */}
      {open && showAnalizar && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
          <div className="bg-white rounded-xl p-8 w-full max-w-lg shadow-xl relative">
            <button
              type="button"
              className="absolute top-2 right-3 text-2xl text-[#b03a1a]"
              onClick={cerrar}
            >×</button>
            <h2 className="text-xl font-bold mb-4 text-[#b03a1a]">
              Archivos de resoluciones/notificaciones subidos
            </h2>
            <p className="mb-3 text-gray-700">¿Deseas analizarlos ya con LitisBot?</p>
            <ul className="mb-4">
              {archivosResueltos.map((a, i) => (
                <li key={i} className="mb-3 flex items-center gap-2">
                  <span className="font-semibold text-[#b03a1a]">{a.nombre}</span>
                  <a
                    href={a.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-700 underline text-xs"
                  >Ver archivo</a>
                  <button
                    className="bg-green-700 hover:bg-green-800 text-white px-3 py-1 rounded text-xs ml-2"
                    onClick={() => analizarConLitisBot(a)}
                  >
                    Analizar con LitisBot
                  </button>
                </li>
              ))}
            </ul>
            <button
              className="mt-3 bg-[#b03a1a] text-white px-6 py-2 rounded font-semibold hover:bg-[#a52e00] w-full"
              onClick={cerrar}
            >
              Terminar
            </button>
          </div>
        </div>
      )}
    </>
  );
}
