import React, { useState, useRef, useEffect } from "react";
import {
  Plus, FolderOpen, Bot, Eye, X, ArrowDownToLine, FileImage, FileText, Printer
} from "lucide-react";
import PerfilFirmaEscaneada from "../components/PerfilFirmaEscaneada";
import ToggleNotificaciones from "../components/ToggleNotificaciones";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import jsPDF from "jspdf";
import "jspdf-autotable";

const USUARIO_ACTUAL = "Abogado Principal";

function iconoPorTipo(nombre = "") {
  if (nombre.match(/\.pdf$/i)) return <FileText size={18} className="text-red-500" />;
  if (nombre.match(/\.(doc|docx)$/i)) return <span className="text-blue-700 text-lg">📄</span>;
  if (nombre.match(/\.(jpg|jpeg|png|gif)$/i)) return <FileImage size={18} className="text-yellow-600" />;
  return <FileText size={18} className="text-gray-400" />;
}

function formatoFecha(fecha) {
  if (!fecha) return "—";
  return new Date(fecha).toLocaleString();
}

export default function CasillaExpedientes() {
  const [notificacionesPorExpediente, setNotificacionesPorExpediente] = useState({});
  const [tipoActivo, setTipoActivo] = useState("judicial");
  const [expedientes, setExpedientes] = useState([]);
  const [contadorId, setContadorId] = useState(1);
  const [editandoId, setEditandoId] = useState(null);
  const [firmaUrl, setFirmaUrl] = useState(localStorage.getItem("firmaEscaneada") || "");

  const [mostrarVisorArchivos, setMostrarVisorArchivos] = useState(false);
  const [expedienteActual, setExpedienteActual] = useState(null);

  const [nuevoDemandante, setNuevoDemandante] = useState({});
  const [nuevoDemandado, setNuevoDemandado] = useState({});

  const [eventos, setEventos] = useState([]);
  const [progreso, setProgreso] = useState(0);
  const [modalHistorial, setModalHistorial] = useState(false);

  const [filtro, setFiltro] = useState("");
  const printRef = useRef();

  const columnasPorTipo = {
    judicial: [
      { label: "Nº Expediente", key: "numero", requerido: true },
      { label: "Órgano Jurisdiccional", key: "organo" },
      { label: "Materia", key: "materia" },
      { label: "Juez", key: "juez" },
      { label: "Especialista", key: "especialista" },
      { label: "Demandante / Denunciante", key: "demandantes", partes: true },
      { label: "Demandado / Denunciado", key: "demandados", partes: true }
    ],
    administrativo: [
      { label: "Nº Expediente", key: "numero", requerido: true },
      { label: "Entidad", key: "entidad" },
      { label: "Materia", key: "materia" },
      { label: "Funcionario Responsable", key: "funcionario" },
      { label: "Estado/Seguimiento", key: "estado" },
      { label: "Cliente", key: "cliente" }
    ]
  };

  const agregarExpediente = () => {
    let nuevoExp = { id: contadorId, tipo: tipoActivo, archivos: [], guardado: false };
    columnasPorTipo[tipoActivo].forEach(col => {
      nuevoExp[col.key] = col.partes ? [] : "";
    });
    setExpedientes(prev => [...prev, nuevoExp]);
    setEditandoId(contadorId);
    setContadorId(prev => prev + 1);
  };

  const onEditarCampo = (id, campo, valor) => {
    setExpedientes(prev =>
      prev.map(exp => (exp.id === id ? { ...exp, [campo]: valor } : exp))
    );
  };

  const agregarParte = (id, campo, valor) => {
    if (!valor.trim()) return;
    setExpedientes(prev =>
      prev.map(exp =>
        exp.id === id
          ? { ...exp, [campo]: [...exp[campo] || [], valor.trim()] }
          : exp
      )
    );
    if (campo === "demandantes") setNuevoDemandante(dm => ({ ...dm, [id]: "" }));
    else setNuevoDemandado(dd => ({ ...dd, [id]: "" }));
  };

  const eliminarParte = (id, campo, idx) => {
    setExpedientes(prev =>
      prev.map(exp =>
        exp.id === id
          ? { ...exp, [campo]: exp[campo].filter((_, i) => i !== idx) }
          : exp
      )
    );
  };

  const handleGuardarExpediente = id => {
    const exp = expedientes.find(e => e.id === id);
    const req = columnasPorTipo[exp.tipo]
      .filter(c => c.requerido)
      .map(c => c.key);
    for (let k of req) {
      if (!exp[k] || (Array.isArray(exp[k]) ? exp[k].length === 0 : !exp[k].trim())) {
        alert("Complete todos los campos requeridos antes de guardar.");
        return;
      }
    }
    setExpedientes(prev =>
      prev.map(exp => (exp.id === id ? { ...exp, guardado: true } : exp))
    );
    setEditandoId(null);
  };

  const handleEditarExpediente = id => setEditandoId(id);

  const abrirVisorArchivos = id => {
    const exp = expedientes.find(e => e.id === id);
    setExpedienteActual(exp);
    setMostrarVisorArchivos(true);
    setEventos([]);
    setFiltro("");
  };
  const cerrarVisorArchivos = () => {
    setMostrarVisorArchivos(false);
    setExpedienteActual(null);
    setProgreso(0);
    setModalHistorial(false);
  };

  // Validación tipo y peso
  const tipoPermitido = /\.(pdf|docx?|jpg|jpeg|png|gif)$/i;
  const pesoMaximoMB = 20;

  const handleSubirArchivo = (id, file) => {
    if (!tipoPermitido.test(file.name)) {
      alert("Solo se permiten archivos PDF, Word o imágenes.");
      return;
    }
    if (file.size > pesoMaximoMB * 1024 * 1024) {
      alert("El archivo supera los 20MB.");
      return;
    }
    setProgreso(5);
    let prog = 5;
    const fakeUpload = setInterval(() => {
      prog += Math.random() * 25;
      setProgreso(Math.min(100, prog));
      if (prog >= 100) {
        clearInterval(fakeUpload);
        setTimeout(() => setProgreso(0), 500);
        const url = URL.createObjectURL(file);
        const archivo = {
          nombre: file.name,
          url,
          fecha: Date.now(),
          user: USUARIO_ACTUAL,
        };
        const evento = `${formatoFecha(archivo.fecha)} - Subido: ${file.name} por ${USUARIO_ACTUAL}`;
        setEventos(prev => [evento, ...prev]);
        setExpedientes(prev =>
          prev.map(exp =>
            exp.id === id
              ? { ...exp, archivos: [...(exp.archivos || []), archivo] }
              : exp
          )
        );
        if (expedienteActual?.id === id) {
          setExpedienteActual({
            ...expedienteActual,
            archivos: [...(expedienteActual.archivos || []), archivo]
          });
        }
      }
    }, 180);
  };

  const handleEliminarArchivo = (id, idx) => {
    const nombre = expedienteActual?.archivos?.[idx]?.nombre || "";
    const evento = `${formatoFecha(Date.now())} - Eliminado: ${nombre} por ${USUARIO_ACTUAL}`;
    setEventos(prev => [evento, ...prev]);
    setExpedientes(prev =>
      prev.map(exp =>
        exp.id === id
          ? { ...exp, archivos: (exp.archivos || []).filter((_, i) => i !== idx) }
          : exp
      )
    );
    if (expedienteActual?.id === id) {
      setExpedienteActual({
        ...expedienteActual,
        archivos: (expedienteActual.archivos || []).filter((_, i) => i !== idx)
      });
    }
  };

  const onOrganizarLitisBot = id =>
    alert(`LitisBot organizará automáticamente los campos del expediente ${id}.`);

  const expedientesFiltrados = expedientes.filter(e => e.tipo === tipoActivo);

  // --- EXPORTACIONES PRO ---
  function filtrarArchivos(lista) {
    if (!filtro.trim()) return lista;
    return lista.filter(a =>
      (a.nombre?.toLowerCase() || "").includes(filtro.toLowerCase())
      || (a.user?.toLowerCase() || "").includes(filtro.toLowerCase())
      || (a.nombre?.split(".").pop().toLowerCase() || "").includes(filtro.toLowerCase())
    );
  }
  const exportarExcel = () => {
    const archivos = filtrarArchivos(expedienteActual?.archivos || []);
    if (!archivos.length) return alert("No hay archivos para exportar.");
    const data = archivos.map(a => ({
      Nombre: a.nombre,
      Fecha: formatoFecha(a.fecha),
      Usuario: a.user,
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Archivos");
    const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    saveAs(new Blob([buf], { type: "application/octet-stream" }),
      `Expediente-${expedienteActual.numero || "sindato"}.xlsx`);
  };
  const exportarPDF = () => {
    const archivos = filtrarArchivos(expedienteActual?.archivos || []);
    if (!archivos.length) return alert("No hay archivos para exportar.");
    const doc = new jsPDF();
    doc.text(`Archivos del Expediente ${expedienteActual?.numero || ""}`, 14, 16);
    doc.autoTable({
      startY: 22,
      head: [["Nombre", "Fecha", "Usuario"]],
      body: archivos.map(a => [
        a.nombre,
        formatoFecha(a.fecha),
        a.user,
      ]),
      styles: { fontSize: 10, cellPadding: 2 },
      headStyles: { fillColor: [176, 58, 26] },
    });
    doc.save(`Expediente-${expedienteActual.numero || "sindato"}.pdf`);
  };
  const imprimirArchivos = () => {
    if (printRef.current) {
      const printContents = printRef.current.innerHTML;
      const win = window.open('', '', 'width=900,height=700');
      win.document.write(`
        <html>
          <head>
            <title>Lista de archivos del expediente</title>
            <style>
              body { font-family: Arial, sans-serif; color: #222; padding: 32px;}
              h2 { color: #b03a1a; }
              .file-row { display: flex; align-items: center; border-bottom: 1px solid #ddd; padding: 6px 0;}
              .file-name { flex: 1; font-weight: bold;}
              .file-date { width: 140px; font-size: 13px; color: #444; }
              .file-user { width: 120px; font-size: 12px; color: #555; }
            </style>
          </head>
          <body>
            <h2>Archivos del Expediente ${expedienteActual?.numero || ""}</h2>
            ${printContents}
          </body>
        </html>
      `);
      win.document.close();
      win.print();
    }
  };

  // -------- MODAL HISTORIAL DE ARCHIVOS AMPLIADO --------
  const modalHistorialArchivos = (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40">
      <div className="bg-white w-full max-w-2xl md:max-w-3xl rounded-xl shadow-xl border relative">
        <button onClick={() => setModalHistorial(false)} className="absolute top-2 right-4 text-xl font-bold text-[#b03a1a]">×</button>
        <div className="p-4 md:p-8">
          <h2 className="text-xl font-bold mb-2 text-[#b03a1a]">Historial completo de archivos</h2>
          <div className="max-h-[60vh] overflow-y-auto">
            {(expedienteActual?.archivos || []).length ? (
              (expedienteActual?.archivos || []).map((file, idx) => (
                <div
                  key={idx}
                  className="flex flex-col md:flex-row md:items-center justify-between p-2 border-b gap-2"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {iconoPorTipo(file.nombre)}
                    <span className="truncate font-medium">{file.nombre}</span>
                  </div>
                  <div className="flex flex-col md:flex-row md:items-center text-xs text-gray-500 pl-2 gap-1">
                    <span>{formatoFecha(file.fecha)}</span>
                    <span className="italic">{file.user}</span>
                  </div>
                  <div className="flex items-center gap-2 pl-2">
                    <button
                      onClick={() => window.open(file.url, "_blank", "noopener,noreferrer")}
                      className="text-blue-600 hover:text-blue-800 text-sm"
                      title="Ver"
                    >
                      <Eye size={16} />
                    </button>
                    <a
                      href={file.url}
                      download={file.nombre}
                      target="_blank"
                      rel="noreferrer"
                      className="text-gray-600 hover:text-gray-800 text-sm"
                      title="Descargar"
                    >
                      <ArrowDownToLine size={16} />
                    </a>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-gray-500 text-center py-6">No hay archivos.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-2 md:p-6 bg-gray-50 min-h-screen">
      {/* Tabs + Agregar */}
      <div className="flex gap-2 md:gap-4 mb-6 items-center">
        <button
          className={`px-2 md:px-4 py-2 rounded font-semibold ${
            tipoActivo === "judicial"
              ? "bg-[#b03a1a] text-white"
              : "bg-white border text-[#b03a1a]"
          }`}
          onClick={() => setTipoActivo("judicial")}
        >
          Judiciales
        </button>
        <button
          className={`px-2 md:px-4 py-2 rounded font-semibold ${
            tipoActivo === "administrativo"
              ? "bg-[#b03a1a] text-white"
              : "bg-white border text-[#b03a1a]"
          }`}
          onClick={() => setTipoActivo("administrativo")}
        >
          Administrativos
        </button>
        <button
          className="flex items-center gap-2 px-3 md:px-4 py-2 rounded bg-blue-700 text-white ml-auto"
          onClick={agregarExpediente}
        >
          <Plus size={18} /> <span className="hidden md:inline">Agregar expediente</span>
        </button>
      </div>

      {/* Tabla Expedientes */}
      <div className="overflow-x-auto rounded-xl shadow border bg-white">
        <table className="min-w-full text-xs md:text-sm">
          <thead className="bg-gray-100 text-[#b03a1a] uppercase text-left">
            <tr>
              <th className="p-2 md:p-3">#</th>
              {columnasPorTipo[tipoActivo].map(col => (
                <th key={col.key} className="p-2 md:p-3">
                  {col.label}
                  {col.requerido && <span className="text-red-500">*</span>}
                </th>
              ))}
              <th className="p-2 md:p-3 text-center">Archivos</th>
              <th className="p-2 md:p-3 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {expedientesFiltrados.length === 0 ? (
              <tr>
                <td
                  colSpan={columnasPorTipo[tipoActivo].length + 3}
                  className="p-6 text-center text-gray-400"
                >
                  No hay expedientes.
                </td>
              </tr>
            ) : (
              expedientesFiltrados.map((exp, idx) => (
                <tr key={exp.id} className="border-t hover:bg-gray-50">
                  <td className="p-2 md:p-3">{idx + 1}</td>
                  {columnasPorTipo[tipoActivo].map(col => (
                    <td key={col.key} className="p-2 md:p-3">
                      {col.partes ? (
                        editandoId === exp.id || !exp.guardado ? (
                          <div>
                            <div className="flex gap-2 mb-1">
                              <input
                                className="border rounded px-1 w-full"
                                value={
                                  (col.key === "demandantes"
                                    ? nuevoDemandante[exp.id]
                                    : nuevoDemandado[exp.id]) || ""
                                }
                                onChange={e => {
                                  const v = e.target.value;
                                  if (col.key === "demandantes")
                                    setNuevoDemandante(dm => ({ ...dm, [exp.id]: v }));
                                  else
                                    setNuevoDemandado(dd => ({ ...dd, [exp.id]: v }));
                                }}
                                placeholder={`Agregar ${col.label.toLowerCase()}`}
                              />
                              <button
                                className="bg-blue-600 text-white px-2 py-1 rounded"
                                type="button"
                                onClick={() =>
                                  agregarParte(
                                    exp.id,
                                    col.key,
                                    (
                                      col.key === "demandantes"
                                        ? nuevoDemandante[exp.id]
                                        : nuevoDemandado[exp.id]
                                    ) || ""
                                  )
                                }
                              >
                                <Plus size={15} />
                              </button>
                            </div>
                            <ul>
                              {(exp[col.key] || []).map((p, i) => (
                                <li
                                  key={i}
                                  className="flex items-center gap-2 bg-gray-100 rounded px-2 py-1 mb-1"
                                >
                                  {p}
                                  <button
                                    className="text-red-500"
                                    onClick={() => eliminarParte(exp.id, col.key, i)}
                                  >
                                    <X size={16} />
                                  </button>
                                </li>
                              ))}
                            </ul>
                          </div>
                        ) : (
                          <ul>
                            {(exp[col.key] || []).map((p, i) => (
                              <li key={i}>{p}</li>
                            ))}
                          </ul>
                        )
                      ) : !exp.guardado || editandoId === exp.id ? (
                        <input
                          className="border rounded px-1 w-full"
                          value={exp[col.key] || ""}
                          onChange={e => onEditarCampo(exp.id, col.key, e.target.value)}
                        />
                      ) : (
                        <span>{exp[col.key]}</span>
                      )}
                    </td>
                  ))}
                  <td className="p-2 md:p-3 text-center">
                    <button
                      disabled={!exp.guardado}
                      onClick={() => abrirVisorArchivos(exp.id)}
                      className={`text-[#b03a1a] hover:text-blue-700 ${
                        !exp.guardado ? "opacity-30 cursor-not-allowed" : ""
                      }`}
                    >
                      <FolderOpen size={20} />
                    </button>
                  </td>
                  <td className="p-2 md:p-3 text-center">
                    {exp.guardado && editandoId !== exp.id ? (
                      <>
                        <button
                          className="bg-yellow-400 text-white px-2 py-1 rounded text-xs mr-1"
                          onClick={() => handleEditarExpediente(exp.id)}
                        >
                          Editar
                        </button>
                        <button
                          className="bg-blue-500 text-white px-2 py-1 rounded flex items-center gap-1 text-xs"
                          onClick={() => onOrganizarLitisBot(exp.id)}
                        >
                          <Bot size={16} /> Organizar
                        </button>
                      </>
                    ) : (
                      <button
                        className="bg-green-600 text-white px-2 py-1 rounded text-xs"
                        onClick={() => handleGuardarExpediente(exp.id)}
                      >
                        Guardar
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* -------- MODAL EXPEDIENTE -------- */}
      {mostrarVisorArchivos && expedienteActual && (
        <div className="fixed inset-0 z-[150] bg-black/40 flex items-center justify-center p-1">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg md:max-w-3xl lg:max-w-4xl min-h-[80vh] relative overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex justify-between items-center px-4 md:px-8 pt-5 pb-2 border-b">
              <h2 className="text-xl md:text-2xl font-bold text-[#b03a1a]">
                Archivos del Expediente {expedienteActual.numero}
              </h2>
              <div className="px-4 md:px-8 pt-2">
                <ToggleNotificaciones
                  value={notificacionesPorExpediente[expedienteActual.id] || false}
                  onChange={valor => setNotificacionesPorExpediente(prev => ({
                    ...prev,
                    [expedienteActual.id]: valor
                  }))}
                />
              </div>
              <button onClick={cerrarVisorArchivos} className="text-2xl text-gray-600 absolute right-5 top-4">×</button>
            </div>
            {/* --- Datos principales --- */}
            <div className="px-4 md:px-8 pt-2 pb-2 grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-1 text-xs md:text-sm font-semibold">
              {expedienteActual.tipo === "judicial" ? (
                <>
                  <div>
                    <b>Nº Expediente:</b> <span className="font-normal">{expedienteActual.numero || "—"}</span>
                  </div>
                  <div>
                    <b>Órgano Jurisdiccional:</b> <span className="font-normal">{expedienteActual.organo || "—"}</span>
                  </div>
                  <div>
                    <b>Materia:</b> <span className="font-normal">{expedienteActual.materia || "—"}</span>
                  </div>
                  <div>
                    <b>Juez:</b> <span className="font-normal">{expedienteActual.juez || "—"}</span>
                  </div>
                  <div>
                    <b>Especialista:</b> <span className="font-normal">{expedienteActual.especialista || "—"}</span>
                  </div>
                  <div>
                    <b>Demandante / Denunciante:</b> <span className="font-normal">{(expedienteActual.demandantes || []).join(", ") || "—"}</span>
                  </div>
                  <div>
                    <b>Demandado / Denunciado:</b> <span className="font-normal">{(expedienteActual.demandados || []).join(", ") || "—"}</span>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <b>Nº Expediente:</b> <span className="font-normal">{expedienteActual.numero || "—"}</span>
                  </div>
                  <div>
                    <b>Entidad:</b> <span className="font-normal">{expedienteActual.entidad || "—"}</span>
                  </div>
                  <div>
                    <b>Materia:</b> <span className="font-normal">{expedienteActual.materia || "—"}</span>
                  </div>
                  <div>
                    <b>Funcionario Responsable:</b> <span className="font-normal">{expedienteActual.funcionario || "—"}</span>
                  </div>
                  <div>
                    <b>Estado/Seguimiento:</b> <span className="font-normal">{expedienteActual.estado || "—"}</span>
                  </div>
                  <div>
                    <b>Cliente:</b> <span className="font-normal">{expedienteActual.cliente || "—"}</span>
                  </div>
                </>
              )}
            </div>
            {/* Resumen e historial */}
            <div className="px-4 md:px-8 pt-1 grid grid-cols-1 md:grid-cols-3 gap-2 mb-2">
              <div className="bg-gray-100 p-2 rounded text-center">
                <b>Total archivos:</b>
                <div className="text-lg font-bold">{(expedienteActual?.archivos?.length || 0)}</div>
              </div>
              <div className="bg-gray-100 p-2 rounded text-center">
                <b>Último archivo:</b>
                <div className="truncate text-xs">{(expedienteActual?.archivos?.slice(-1)[0]?.nombre) || '—'}</div>
              </div>
              <div className="bg-gray-100 p-2 rounded text-center">
                <b>Fecha actual:</b>
                <div className="text-xs">{new Date().toLocaleDateString()}</div>
              </div>
            </div>
            <div className="px-4 md:px-8 pt-1 pb-1">
              <b>Historial de archivos:</b>
              <div className="max-h-20 overflow-y-auto mt-1 text-xs md:text-sm text-gray-700 px-1">
                {eventos.length ? (
                  <ul className="list-disc pl-4">
                    {eventos.map((e, i) => (<li key={i}>{e}</li>))}
                  </ul>
                ) : (
                  <div className="text-gray-400">Sin movimientos aún.</div>
                )}
              </div>
            </div>
            {/* Buscador y Exportar */}
            <div className="flex flex-col md:flex-row gap-2 items-center px-4 md:px-8 pb-2">
              <input
                type="text"
                placeholder="Buscar archivo por nombre, user o tipo..."
                className="border rounded px-2 py-1 w-full md:w-72 text-sm"
                value={filtro}
                onChange={e => setFiltro(e.target.value)}
              />
              <button
                className="flex items-center gap-1 bg-gray-200 hover:bg-blue-600 hover:text-white text-[#b03a1a] font-bold px-3 py-2 rounded mt-2 md:mt-0"
                onClick={imprimirArchivos}
                title="Imprimir lista"
              >
                <Printer size={18} /> Imprimir
              </button>
              <button
                className="flex items-center gap-1 bg-gray-200 hover:bg-green-700 hover:text-white text-[#3c763d] font-bold px-3 py-2 rounded"
                onClick={exportarExcel}
                title="Exportar a Excel"
              >
                <span style={{fontWeight:'bold'}}>XLS</span>
              </button>
              <button
                className="flex items-center gap-1 bg-gray-200 hover:bg-red-700 hover:text-white text-[#c0392b] font-bold px-3 py-2 rounded"
                onClick={exportarPDF}
                title="Exportar a PDF"
              >
                <span style={{fontWeight:'bold'}}>PDF</span>
              </button>
            </div>
            {/* Subir archivo */}
            <div className="px-4 md:px-8 py-2 flex flex-col gap-2 flex-1">
              {progreso > 0 && (
                <div className="w-full bg-gray-200 rounded h-2 mb-2">
                  <div style={{ width: `${progreso}%` }} className="bg-blue-600 h-2 rounded transition-all"></div>
                </div>
              )}
              <input
                type="file"
                onChange={e => {
                  const f = e.target.files[0];
                  if (f) handleSubirArchivo(expedienteActual.id, f);
                  e.target.value = "";
                }}
                title="Subir archivo (PDF, Word, imagen, máx 20MB)"
                className="mb-2"
              />
              <div ref={printRef} className="bg-gray-50 p-3 rounded max-h-[40vh] md:max-h-[52vh] overflow-y-auto space-y-2 mt-1 shadow-inner print:bg-white print:p-0">
                {filtrarArchivos(expedienteActual?.archivos || []).length ? (
                  filtrarArchivos(expedienteActual.archivos || [])
                    .slice(-7)
                    .map((file, idx) => (
                      <div
                        key={idx}
                        className="file-row flex flex-col md:flex-row md:items-center justify-between p-2 bg-white border rounded gap-1 print:bg-white print:shadow-none print:rounded-none"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          {iconoPorTipo(file.nombre)}
                          <span className="file-name truncate font-medium">{file.nombre}</span>
                        </div>
                        <span className="file-date">{formatoFecha(file.fecha)}</span>
                        <span className="file-user italic">{file.user}</span>
                        <div className="flex items-center gap-2 pl-2 no-print">
                          <button
                            onClick={() => window.open(file.url, "_blank", "noopener,noreferrer")}
                            className="text-blue-600 hover:text-blue-800 text-sm"
                            title="Ver"
                          >
                            <Eye size={16} />
                          </button>
                          <a
                            href={file.url}
                            download={file.nombre}
                            target="_blank"
                            rel="noreferrer"
                            className="text-gray-600 hover:text-gray-800 text-sm"
                            title="Descargar"
                          >
                            <ArrowDownToLine size={16} />
                          </a>
                          <button
                            onClick={() => handleEliminarArchivo(expedienteActual.id, idx)}
                            className="text-red-500 text-sm"
                            title="Eliminar"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      </div>
                    ))
                ) : (
                  <div className="text-gray-500 text-center">No hay archivos.</div>
                )}
              </div>
              {(expedienteActual?.archivos?.length || 0) > 7 && (
                <button
                  className="mt-1 underline text-blue-700 hover:text-blue-900 text-xs font-semibold"
                  onClick={() => setModalHistorial(true)}
                >
                  Ver todos los archivos subidos...
                </button>
              )}
            </div>
            <div className="px-4 md:px-8 pb-2">
              <PerfilFirmaEscaneada firmaUrl={firmaUrl} setFirmaUrl={setFirmaUrl} />
            </div>
            {/* Botón cerrar */}
            <div className="flex justify-end px-4 md:px-8 py-4 border-t">
              <button
                onClick={cerrarVisorArchivos}
                className="w-full md:w-auto bg-blue-700 text-white px-4 py-2 rounded hover:bg-blue-800 text-base md:text-lg"
              >
                Cerrar
              </button>
            </div>
            {modalHistorial && modalHistorialArchivos}
          </div>
        </div>
      )}
    </div>
  );
}
