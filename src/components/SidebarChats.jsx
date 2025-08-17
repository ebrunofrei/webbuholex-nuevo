import React, { useState, useEffect } from "react";
import { FaHome, FaPlus, FaEdit, FaTrash, FaRecycle, FaCog, FaUser } from "react-icons/fa";

// Utils para ID único
function uuid() {
  return "_" + Math.random().toString(36).substr(2, 9);
}

// Modal genérico reutilizable
function Modal({ open, onClose, children }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl p-6 w-full max-w-xs relative border-2 border-yellow-700">
        <button
          className="absolute right-3 top-2 text-yellow-800 text-2xl font-bold"
          onClick={onClose}
        >×</button>
        {children}
      </div>
    </div>
  );
}

export default function SidebarChats({
  user = { nombre: "Invitado", pro: false },
  casos: casosProp,
  setCasos: setCasosProp,
  casoActivo: casoActivoProp,
  setCasoActivo: setCasoActivoProp,
  onOpenHerramientas
}) {
  // Persistencia local
  const [casos, setCasos] = useState(() =>
    JSON.parse(localStorage.getItem("litisbot_casos") || "[]")
  );
  const [casoActivo, setCasoActivo] = useState(() =>
    localStorage.getItem("litisbot_caso_activo") || ""
  );

  // Papelera
  const [verPapelera, setVerPapelera] = useState(false);

  // Nuevo chat/caso
  const [modalNuevo, setModalNuevo] = useState(false);
  const [nombreNuevo, setNombreNuevo] = useState("");

  // Renombrar chat
  const [editId, setEditId] = useState("");
  const [editNombre, setEditNombre] = useState("");

  // Eliminar chat/caso
  const [deleteId, setDeleteId] = useState("");
  const [deleteFinal, setDeleteFinal] = useState(false);

  // Actualizar localStorage
  useEffect(() => {
    localStorage.setItem("litisbot_casos", JSON.stringify(casos));
    if (setCasosProp) setCasosProp(casos);
  }, [casos]);
  useEffect(() => {
    localStorage.setItem("litisbot_caso_activo", casoActivo);
    if (setCasoActivoProp) setCasoActivoProp(casoActivo);
  }, [casoActivo]);

  // Al crear/renombrar/seleccionar
  function handleNuevoChat(e) {
    e.preventDefault();
    const nuevo = {
      id: uuid(),
      nombre: nombreNuevo.trim() || "Nuevo chat",
      papelera: false,
      mensajes: [],
      creadoEn: Date.now(),
    };
    setCasos([nuevo, ...casos]);
    setCasoActivo(nuevo.id);
    setNombreNuevo("");
    setModalNuevo(false);
  }

  function handleRenombrar(id, nuevoNombre) {
    setCasos(casos => casos.map(c =>
      c.id === id ? { ...c, nombre: nuevoNombre } : c
    ));
    setEditId("");
    setEditNombre("");
  }

  function handleEliminar(id, permanente = false) {
    if (permanente) {
      setCasos(casos => casos.filter(c => c.id !== id));
      setDeleteId("");
    } else {
      setCasos(casos => casos.map(c => c.id === id ? { ...c, papelera: true } : c));
      setDeleteId("");
    }
    // Si se elimina el activo, limpiar selección
    if (casoActivo === id) setCasoActivo("");
  }

  function handleRestaurar(id) {
    setCasos(casos => casos.map(c => c.id === id ? { ...c, papelera: false } : c));
  }

  // Vistas
  const chatsVisibles = casos.filter(c => !c.papelera);
  const chatsPapelera = casos.filter(c => c.papelera);

  // Sidebar
  return (
    <aside
      className="flex flex-col bg-yellow-50 min-h-screen border-r border-yellow-100 w-[240px] px-0"
      style={{ position: "relative", minWidth: 210, maxWidth: 350 }}
    >
      {/* Home */}
      <button
        className="flex items-center gap-2 font-bold text-brown-900 py-3 px-6 hover:bg-yellow-100 transition text-lg border-b border-yellow-200"
        style={{ borderRadius: 0 }}
        onClick={() => window.location.href = "/"}
        title="Volver al inicio"
      >
        <FaHome size={22} /> Home
      </button>

      {/* Herramientas */}
      <button
        className="flex items-center gap-2 font-bold text-brown-900 py-3 px-6 hover:bg-yellow-100 transition text-lg border-b border-yellow-200"
        style={{ borderRadius: 0 }}
        onClick={onOpenHerramientas}
        title="Abrir herramientas"
      >
        <FaCog size={18} /> Herramientas
      </button>

      {/* Nuevo chat/caso */}
      <button
        className="flex items-center gap-2 font-bold text-brown-900 py-3 px-6 hover:bg-yellow-100 transition text-md border-b border-yellow-200"
        style={{ borderRadius: 0 }}
        onClick={() => setModalNuevo(true)}
        title="Crear nuevo chat/caso"
      >
        <FaPlus size={18} /> Nuevo chat
      </button>

      {/* Lista de chats */}
      <div className="px-4 pt-3 pb-1 text-[15px] font-medium text-brown-900">Chats recientes</div>
      <div className="flex-1 overflow-y-auto px-2">
        {chatsVisibles.length === 0 && (
          <div className="text-sm text-brown-400 px-1">Aún no has creado ningún chat/caso.</div>
        )}
        {chatsVisibles.map(c => (
          <div key={c.id}
            className={`flex items-center px-2 py-2 mb-1 rounded-lg cursor-pointer transition
            ${casoActivo === c.id ? "bg-yellow-200 font-bold" : "hover:bg-yellow-100"}
            `}
            style={{ fontSize: 16 }}
            onClick={() => setCasoActivo(c.id)}
          >
            <span className="mr-2" role="img" aria-label="chat">💬</span>
            {editId === c.id ? (
              <form
                onSubmit={e => { e.preventDefault(); handleRenombrar(c.id, editNombre); }}
                className="flex-1 flex items-center"
              >
                <input
                  className="border-b border-yellow-600 bg-transparent px-1 text-brown-900"
                  value={editNombre}
                  autoFocus
                  onChange={e => setEditNombre(e.target.value)}
                  onBlur={() => setEditId("")}
                  maxLength={36}
                />
                <button type="submit" className="ml-1 text-green-700"><FaEdit /></button>
              </form>
            ) : (
              <>
                <span
                  className="flex-1 truncate"
                  onDoubleClick={() => { setEditId(c.id); setEditNombre(c.nombre); }}
                  title="Haz doble clic para renombrar"
                >
                  {c.nombre}
                </span>
                <button className="ml-2 text-yellow-900 hover:text-yellow-700"
                  onClick={e => { e.stopPropagation(); setEditId(c.id); setEditNombre(c.nombre); }}
                  title="Renombrar"
                >
                  <FaEdit size={16} />
                </button>
                <button className="ml-1 text-red-700 hover:text-red-900"
                  onClick={e => { e.stopPropagation(); setDeleteId(c.id); setDeleteFinal(false); }}
                  title="Eliminar chat/caso"
                >
                  <FaTrash size={16} />
                </button>
              </>
            )}
          </div>
        ))}

        {/* Papelera (si hay) */}
        {chatsPapelera.length > 0 && (
          <>
            <div className="px-1 pt-4 pb-1 text-yellow-700 font-semibold flex items-center gap-1">
              <FaRecycle /> Papelera
            </div>
            {chatsPapelera.map(c => (
              <div key={c.id}
                className="flex items-center px-2 py-2 mb-1 rounded-lg bg-yellow-100 text-yellow-800"
                style={{ fontSize: 16, opacity: 0.7 }}
              >
                <span className="mr-2" role="img" aria-label="chat">💬</span>
                <span className="flex-1 truncate">{c.nombre}</span>
                <button className="ml-1 text-green-800 hover:text-green-900"
                  onClick={() => handleRestaurar(c.id)}
                  title="Restaurar chat"
                >
                  <FaRecycle size={16} />
                </button>
                <button className="ml-1 text-red-700 hover:text-red-900"
                  onClick={() => { setDeleteId(c.id); setDeleteFinal(true); }}
                  title="Eliminar definitivamente"
                >
                  <FaTrash size={16} />
                </button>
              </div>
            ))}
          </>
        )}
      </div>

      {/* Footer con usuario */}
      <div className="flex items-center px-3 py-3 border-t border-yellow-200 bg-yellow-50 mt-auto">
        <div
          className="rounded-full bg-yellow-700 text-white flex items-center justify-center w-8 h-8 mr-2"
          style={{ fontWeight: "bold", fontSize: 18 }}
        >
          <FaUser size={18} />
        </div>
        <div>
          <div className="font-bold text-brown-900">{user.nombre || "Invitado"}</div>
          <div className="text-xs text-yellow-800">{user.pro ? "Acceso PRO" : "Acceso Básico"}</div>
        </div>
      </div>

      {/* MODALES */}
      {/* Nuevo caso */}
      <Modal open={modalNuevo} onClose={() => setModalNuevo(false)}>
        <form onSubmit={handleNuevoChat}>
          <div className="font-bold text-lg text-yellow-900 mb-3">¿Nuevo Caso?</div>
          <div className="text-brown-800 mb-2 text-sm">
            Los casos creados conservan los chats, los archivos y las instrucciones personalizadas en un solo lugar.<br />
            Úsalos para tu trabajo en curso o simplemente para tenerlo todo ordenado.
          </div>
          <input
            className="border rounded px-2 py-1 w-full mb-3"
            placeholder="Nombre del caso"
            value={nombreNuevo}
            maxLength={40}
            autoFocus
            onChange={e => setNombreNuevo(e.target.value)}
          />
          <button
            type="submit"
            className="w-full py-2 bg-yellow-700 text-white font-bold rounded shadow hover:bg-yellow-800 transition"
            disabled={!nombreNuevo.trim()}
          >
            Crear caso
          </button>
        </form>
      </Modal>
      {/* Confirmar eliminar */}
      <Modal open={!!deleteId} onClose={() => setDeleteId("")}>
        <div className="font-bold text-lg text-yellow-900 mb-3">
          {deleteFinal ? "Eliminar definitivamente" : "Eliminar chat/caso"}
        </div>
        <div className="mb-4 text-brown-800 text-sm">
          {deleteFinal
            ? "¿Seguro que deseas eliminar este chat/caso de forma permanente? Esta acción no se puede deshacer."
            : "¿Seguro que deseas eliminar este chat/caso? Podrás restaurarlo desde la papelera."}
        </div>
        <div className="flex gap-2">
          <button
            className="flex-1 py-2 bg-yellow-700 text-white rounded font-bold hover:bg-yellow-900"
            onClick={() => handleEliminar(deleteId, deleteFinal)}
          >
            Sí, eliminar
          </button>
          <button
            className="flex-1 py-2 bg-gray-200 rounded font-bold hover:bg-gray-300"
            onClick={() => setDeleteId("")}
          >
            Cancelar
          </button>
        </div>
      </Modal>
    </aside>
  );
}
