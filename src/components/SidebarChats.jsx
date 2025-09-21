import React, { useState, useEffect } from "react";
import { FaHome, FaPlus, FaCog, FaUser } from "react-icons/fa";

function uuid() {
  return "_" + Math.random().toString(36).substr(2, 9);
}

function Modal({ open, onClose, children }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl p-6 w-full max-w-xs relative border-2 border-yellow-700">
        <button
          className="absolute right-3 top-2 text-yellow-800 text-2xl font-bold"
          onClick={onClose}
        >
          ×
        </button>
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
  const [open, setOpen] = useState(false);
  const [casos, setCasos] = useState(() =>
    JSON.parse(localStorage.getItem("litisbot_casos") || "[]")
  );
  const [casoActivo, setCasoActivo] = useState(() =>
    localStorage.getItem("litisbot_caso_activo") || ""
  );
  const [modalNuevo, setModalNuevo] = useState(false);
  const [nombreNuevo, setNombreNuevo] = useState("");

  useEffect(() => {
    localStorage.setItem("litisbot_casos", JSON.stringify(casos));
    if (setCasosProp) setCasosProp(casos);
  }, [casos]);

  useEffect(() => {
    localStorage.setItem("litisbot_caso_activo", casoActivo);
    if (setCasoActivoProp) setCasoActivoProp(casoActivo);
  }, [casoActivo]);

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
    setOpen(false); // cerrar drawer en móvil
  }

  const chatsVisibles = casos.filter(c => !c.papelera);

  return (
    <>
      {/* Botón abrir en móvil */}
      {!open && (
        <button
          className="fixed top-4 left-4 z-[75] md:hidden bg-yellow-700 text-white p-2 rounded-full shadow"
          onClick={() => setOpen(true)}
          aria-label="Abrir menú"
        >
          ☰
        </button>
      )}

      {/* Overlay para cerrar tocando fuera */}
      {open && (
        <div
          className="fixed inset-0 bg-black/50 z-[60] md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={[
          // móvil: drawer off-canvas
          "fixed inset-y-0 left-0 w-64 bg-yellow-50 border-r z-[80] transform transition-transform duration-300",
          open ? "translate-x-0" : "-translate-x-full",
          // desktop: estático y ocupa espacio; se desactiva la traducción y el fixed
          "md:translate-x-0 md:static md:h-[100dvh]"
        ].join(" ")}
      >
        <button
          className="flex items-center gap-2 font-bold text-brown-900 py-3 px-6 hover:bg-yellow-100 transition text-lg border-b border-yellow-200"
          onClick={() => (window.location.href = "/")}
        >
          <FaHome size={22} /> Home
        </button>

        <button
          className="flex items-center gap-2 font-bold text-brown-900 py-3 px-6 hover:bg-yellow-100 transition text-lg border-b border-yellow-200"
          onClick={onOpenHerramientas}
        >
          <FaCog size={18} /> Herramientas
        </button>

        <button
          className="flex items-center gap-2 font-bold text-brown-900 py-3 px-6 hover:bg-yellow-100 transition text-md border-b border-yellow-200"
          onClick={() => setModalNuevo(true)}
        >
          <FaPlus size={18} /> Nuevo chat
        </button>

        {/* Lista de chats */}
        <div className="px-4 pt-3 pb-1 text-[15px] font-medium text-brown-900">Chats recientes</div>
        <div className="flex-1 overflow-y-auto px-2">
          {chatsVisibles.map(c => (
            <div
              key={c.id}
              className="flex items-center px-2 py-2 mb-1 rounded-lg cursor-pointer transition hover:bg-yellow-100"
              onClick={() => {
                setCasoActivo(c.id);
                setOpen(false); // cerrar drawer en móvil
              }}
            >
              <span className="mr-2">💬</span>
              {c.nombre}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center px-3 py-3 border-t border-yellow-200 bg-yellow-50 mt-auto">
          <div className="rounded-full bg-yellow-700 text-white flex items-center justify-center w-8 h-8 mr-2">
            <FaUser size={18} />
          </div>
          <div>
            <div className="font-bold text-brown-900">{user.nombre || "Invitado"}</div>
            <div className="text-xs text-yellow-800">{user.pro ? "Acceso PRO" : "Acceso Básico"}</div>
          </div>
        </div>

        {/* Botón cerrar en móvil */}
        <button
          className="md:hidden absolute top-4 right-4 text-yellow-900 text-2xl"
          onClick={() => setOpen(false)}
          aria-label="Cerrar menú"
        >
          ✖️
        </button>
      </aside>

      {/* Modal de “Nuevo chat” (simple) */}
      <Modal open={modalNuevo} onClose={() => setModalNuevo(false)}>
        <form onSubmit={handleNuevoChat} className="flex flex-col gap-3">
          <div className="font-bold text-yellow-800">Nombre del chat</div>
          <input
            className="border rounded px-3 py-2"
            value={nombreNuevo}
            onChange={e => setNombreNuevo(e.target.value)}
            autoFocus
          />
          <button className="bg-yellow-700 text-white rounded px-3 py-2">Crear</button>
        </form>
      </Modal>
    </>
  );
}
