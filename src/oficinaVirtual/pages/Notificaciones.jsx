import React, { useState, useEffect } from "react";
import { Eye, FolderPlus, MailCheck } from "lucide-react";
import Modal from "@/components/Modal";

// Simulación de expedientes
const DUMMY_EXPEDIENTES = [
  { id: 1, numero: "001-2025", tipo: "judicial" },
  { id: 2, numero: "EXP-AD-045", tipo: "administrativo" },
];

// Simulación de usuario/casilla única
const USER_CASILLA_ID = "3264"; // Cambia a tu userId real

export default function Notificaciones() {
  // ... estados de antes
  const [pdfFile, setPdfFile] = useState(null);
  const [pdfURL, setPdfURL] = useState("");
  const [modalViewPDF, setModalViewPDF] = useState(false);
  const [asignarModal, setAsignarModal] = useState(false);
  const [expedienteSeleccionado, setExpedienteSeleccionado] = useState("");
  const [notificaciones, setNotificaciones] = useState([]);
  const [estado, setEstado] = useState("no_leido");
  const [alerta, setAlerta] = useState(null);

  // Cargar notificaciones simuladas (usa tu Firestore real)
  useEffect(() => {
    setNotificaciones([]);
  }, []);

  // Simulación de llegada de notificación externa (con LitisBot)
  const handleRecepcionExterna = (file) => {
    // Aquí subirías el archivo recibido por terceros
    const url = URL.createObjectURL(file);
    const nueva = {
      id: Date.now(),
      nombre: file.name,
      url,
      expediente: "",
      fecha: new Date(),
      estado: "no_leido",
      externa: true,
    };
    setNotificaciones((prev) => [...prev, nueva]);
    setAlerta({
      titulo: "Nueva notificación externa recibida",
      mensaje: `LitisBot: Tienes una nueva notificación por ${file.name}. Revísala y asígnala a un expediente.`,
    });
    // Aquí podrías integrar Firebase Cloud Messaging o push
  };

  // Manejar archivo subido (manual o externo)
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file && file.type === "application/pdf") {
      setPdfFile(file);
      setPdfURL(URL.createObjectURL(file));
      setEstado("no_leido");
    } else {
      alert("Solo se permite PDF");
      setPdfFile(null);
      setPdfURL("");
    }
  };

  // Simular formulario de terceros para pruebas (esto será una ruta pública para SINOE, fiscalía, etc.)
  const CasillaExternaForm = () => (
    <div className="mb-4 p-3 border rounded bg-white">
      <strong>Recibir notificación externa</strong>
      <div className="flex flex-col md:flex-row gap-2 items-center mt-2">
        <input
          type="file"
          accept="application/pdf"
          onChange={(e) => {
            if (e.target.files[0]) handleRecepcionExterna(e.target.files[0]);
          }}
          className="border p-2 rounded w-full md:w-auto"
        />
        <span className="text-xs text-gray-500">
          (Para SINOE, fiscalía, otros: envía PDF aquí o a tu enlace único)
        </span>
      </div>
      <div className="mt-2 text-xs text-blue-600 break-all">
        Enlace de recepción externo: <br />
        <b>
          {`${window.location.origin}/oficinaVirtual/notificaciones/recibir?user=${USER_CASILLA_ID}`}
        </b>
      </div>
    </div>
  );

  const handleGuardarNotificacion = () => {
    if (!pdfFile || !expedienteSeleccionado) {
      alert("Seleccione PDF y expediente.");
      return;
    }
    const nueva = {
      id: Date.now(),
      nombre: pdfFile.name,
      url: pdfURL,
      expediente: expedienteSeleccionado,
      fecha: new Date(),
      estado,
      externa: false,
    };
    setNotificaciones((prev) => [...prev, nueva]);
    setPdfFile(null);
    setPdfURL("");
    setAsignarModal(false);
    setExpedienteSeleccionado("");
  };

  return (
    <div className="p-3 md:p-8 max-w-4xl mx-auto min-h-screen bg-gray-50">
      <h2 className="font-bold text-lg md:text-2xl mb-4 flex items-center">
        <span role="img" aria-label="bandeja" className="mr-2">📥</span>
        Bandeja de Documentos Subidos / Notificaciones
      </h2>

      {/* CASILLA EXTERNA */}
      <CasillaExternaForm />

      {/* ALERTA DE LITISBOT */}
      {alerta && (
        <div className="my-2 bg-yellow-100 border-l-4 border-yellow-500 text-yellow-800 p-3 rounded shadow flex items-center">
          <span className="mr-2"><MailCheck /></span>
          <span>
            <b>{alerta.titulo}</b><br />
            {alerta.mensaje}
          </span>
          <button
            className="ml-auto px-2 py-1 bg-yellow-200 hover:bg-yellow-300 rounded"
            onClick={() => setAlerta(null)}
          >
            Cerrar
          </button>
        </div>
      )}

      {/* Subida manual de PDF */}
      <div className="flex flex-col md:flex-row gap-3 items-center bg-white p-4 rounded-xl shadow mb-6">
        <input
          type="file"
          accept="application/pdf"
          onChange={handleFileChange}
          className="border p-2 rounded w-full md:w-auto"
        />
        {pdfFile && (
          <span className="truncate flex-1">{pdfFile.name}</span>
        )}
        {pdfFile && (
          <>
            <button
              className="flex items-center gap-1 bg-blue-600 text-white rounded px-3 py-2"
              onClick={() => setModalViewPDF(true)}
              title="Visualizar PDF"
            >
              <Eye size={18} /> Ver PDF
            </button>
            <button
              className="flex items-center gap-1 bg-green-600 text-white rounded px-3 py-2"
              onClick={() => setAsignarModal(true)}
              title="Asignar a expediente"
            >
              <FolderPlus size={18} /> Asignar/Guardar
            </button>
          </>
        )}
      </div>

      {/* Tabla Notificaciones */}
      <div className="overflow-x-auto rounded-xl shadow border bg-white">
        <table className="min-w-full text-xs md:text-sm">
          <thead className="bg-gray-100 text-[#b03a1a] uppercase text-left">
            <tr>
              <th>#</th>
              <th>Estado</th>
              <th>PDF/Archivo</th>
              <th>Expediente</th>
              <th>Fecha</th>
              <th className="text-center">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {notificaciones.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center p-6 text-gray-400">No hay notificaciones aún.</td>
              </tr>
            ) : (
              notificaciones.map((n, i) => (
                <tr key={n.id} className="border-t hover:bg-gray-50">
                  <td>{i + 1}</td>
                  <td>
                    <span className={n.estado === "leido" ? "text-green-600" : "text-red-600"}>
                      ●
                    </span>
                  </td>
                  <td>
                    <span className="truncate block w-32 md:w-44">{n.nombre}</span>
                  </td>
                  <td>{n.expediente}</td>
                  <td>{new Date(n.fecha).toLocaleString()}</td>
                  <td className="text-center">
                    <button
                      onClick={() => {
                        setPdfURL(n.url);
                        setModalViewPDF(true);
                        setEstado("leido");
                      }}
                      className="text-blue-700 hover:text-blue-900"
                      title="Ver PDF"
                    >
                      <Eye size={18} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal PDF Viewer */}
      <Modal isOpen={modalViewPDF} onClose={() => setModalViewPDF(false)}>
        <div className="w-full h-[70vh] flex flex-col items-center justify-center">
          {pdfURL ? (
            <iframe
              src={pdfURL}
              title="PDF"
              className="w-full h-full rounded shadow border"
            />
          ) : (
            <div>No PDF seleccionado.</div>
          )}
        </div>
      </Modal>

      {/* Modal Asignar a expediente */}
      <Modal isOpen={asignarModal} onClose={() => setAsignarModal(false)}>
        <div className="w-full max-w-xs mx-auto p-4">
          <h3 className="font-bold mb-2 text-lg text-center">Asignar a Expediente</h3>
          <select
            value={expedienteSeleccionado}
            onChange={e => setExpedienteSeleccionado(e.target.value)}
            className="w-full border rounded px-2 py-1 mb-4"
          >
            <option value="">Seleccione expediente...</option>
            {DUMMY_EXPEDIENTES.map(e => (
              <option key={e.id} value={e.numero}>
                {e.numero} ({e.tipo})
              </option>
            ))}
          </select>
          <button
            className="w-full bg-green-600 text-white px-3 py-2 rounded"
            onClick={handleGuardarNotificacion}
          >
            Guardar
          </button>
        </div>
      </Modal>
    </div>
  );
}
