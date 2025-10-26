import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  FaHome,
  FaPlus,
  FaEdit,
  FaTrash,
  FaRecycle,
  FaCog,
  FaUser,
  FaTimes,
} from "react-icons/fa";

// Utils para ID único
function uuid() {
  return "_" + Math.random().toString(36).substr(2, 9);
}

// Modal genérico reutilizable
function Modal({ open, onClose, children }) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[400] flex items-center justify-center bg-black/40"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl p-6 w-full max-w-xs relative border-2 border-yellow-700"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="absolute right-3 top-2 text-yellow-800 text-2xl font-bold"
          onClick={onClose}
          aria-label="Cerrar"
        >
          ×
        </button>
        {children}
      </div>
    </div>
  );
}

/**
 * SidebarChats
 *
 * - En DESKTOP (lg+): sidebar fijo de 300px siempre visible
 * - En MÓVIL (<lg): se muestra como UNA PANTALLA COMPLETA modal (tipo hoja)
 *   que cubre todo, con su propio header "Mis casos" + botón "X".
 *
 * Props importantes:
 *   isOpen (bool)        -> solo relevante en móvil
 *   onCloseSidebar()     -> cerrar en móvil
 */
export default function SidebarChats({
  user = { nombre: "Invitado", pro: false, uid: "" },
  setCasos: setCasosProp,
  setCasoActivo: setCasoActivoProp,
  onOpenHerramientas,
  isOpen = true, // quién controla si el sheet móvil está visible
  onCloseSidebar, // cerrar en móvil
}) {
  /* ============================================================
     Claves de almacenamiento (aisladas por usuario)
  ============================================================ */
  const ns = useMemo(
    () => (user?.uid ? `litisbot:${user.uid}` : "litisbot:anon"),
    [user?.uid]
  );
  const CASOS_KEY = `${ns}:casos`;
  const ACTIVO_KEY = `${ns}:caso_activo`;

  // Estado inicial seguro (evita localStorage en SSR)
  const [casos, setCasos] = useState([]);
  const [casoActivo, setCasoActivo] = useState("");

  // Estados internos de UI
  const [modalNuevo, setModalNuevo] = useState(false);
  const [nombreNuevo, setNombreNuevo] = useState("");
  const [editId, setEditId] = useState("");
  const [editNombre, setEditNombre] = useState("");
  const [deleteId, setDeleteId] = useState("");
  const [deleteFinal, setDeleteFinal] = useState(false);

  /* ============================================================
     Carga inicial + migración de storage (solo cliente)
  ============================================================ */
  useEffect(() => {
    try {
      const guardados = JSON.parse(localStorage.getItem(CASOS_KEY) || "[]");
      setCasos(guardados);
    } catch {
      setCasos([]);
    }

    const activo = localStorage.getItem(ACTIVO_KEY);
    if (activo) setCasoActivo(activo);

    // Migración de claves antiguas
    const oldCasos = localStorage.getItem("litisbot_casos");
    const oldActivo = localStorage.getItem("litisbot_caso_activo");
    if (oldCasos && !localStorage.getItem(CASOS_KEY)) {
      localStorage.setItem(CASOS_KEY, oldCasos);
      localStorage.removeItem("litisbot_casos");
    }
    if (oldActivo && !localStorage.getItem(ACTIVO_KEY)) {
      localStorage.setItem(ACTIVO_KEY, oldActivo);
      localStorage.removeItem("litisbot_caso_activo");
    }
  }, [CASOS_KEY, ACTIVO_KEY]);

  /* ============================================================
     Persistencia reactiva + sync hacia el padre
  ============================================================ */
  useEffect(() => {
    if (casos.length) {
      localStorage.setItem(CASOS_KEY, JSON.stringify(casos));
      setCasosProp?.(casos);
    }
  }, [casos, CASOS_KEY, setCasosProp]);

  useEffect(() => {
    if (casoActivo) {
      localStorage.setItem(ACTIVO_KEY, casoActivo);
      setCasoActivoProp?.(casoActivo);
    }
  }, [casoActivo, ACTIVO_KEY, setCasoActivoProp]);

  // Asegura caso activo válido
  useEffect(() => {
    if (!casos.length) {
      if (casoActivo) setCasoActivo("");
      return;
    }
    const existe = casos.some((c) => c.id === casoActivo && !c.papelera);
    if (!existe) {
      const primero = casos.find((c) => !c.papelera);
      if (primero) setCasoActivo(primero.id);
    }
  }, [casos, casoActivo]);

  /* ============================================================
     Acciones sobre casos
  ============================================================ */
  function handleNuevoChat(e) {
    e.preventDefault();
    const nuevo = {
      id: uuid(),
      nombre: (nombreNuevo || "").trim() || "Nuevo caso",
      papelera: false,
      creadoEn: Date.now(),
    };
    setCasos((prev) => [nuevo, ...prev]);
    setCasoActivo(nuevo.id);
    setNombreNuevo("");
    setModalNuevo(false);
    onCloseSidebar?.(); // en móvil cerramos "pantalla"
  }

  function handleRenombrar(id, nuevoNombre) {
    const name = (nuevoNombre || "").trim();
    if (!name) return;
    setCasos((prev) =>
      prev.map((c) => (c.id === id ? { ...c, nombre: name } : c))
    );
    setEditId("");
    setEditNombre("");
  }

  function handleEliminar(id, permanente = false) {
    if (permanente) {
      setCasos((prev) => prev.filter((c) => c.id !== id));
    } else {
      setCasos((prev) =>
        prev.map((c) => (c.id === id ? { ...c, papelera: true } : c))
      );
    }
    setDeleteId("");
    if (casoActivo === id) setCasoActivo("");
  }

  function handleRestaurar(id) {
    setCasos((prev) =>
      prev.map((c) => (c.id === id ? { ...c, papelera: false } : c))
    );
  }

  const seleccionarCaso = useCallback(
    (id) => {
      setCasoActivo(id);
      onCloseSidebar?.(); // cerrar pantalla en móvil
    },
    [onCloseSidebar]
  );

  /* ============================================================
     Render helpers
  ============================================================ */
  const chatsVisibles = casos.filter((c) => !c.papelera);
  const chatsPapelera = casos.filter((c) => c.papelera);

  // --- Bloque lista de casos + acciones (sin wrapper responsive)
  const ListaContenido = (
    <>
      {/* Botones de navegación / acciones principales */}
      <button
        className="flex items-center gap-2 font-bold text-brown-900 py-3 px-4 hover:bg-yellow-100 transition text-base border-b border-yellow-200"
        onClick={() => (window.location.href = "/")}
      >
        <FaHome size={20} /> Home
      </button>

      <button
        className="flex items-center gap-2 font-bold text-brown-900 py-3 px-4 hover:bg-yellow-100 transition text-base border-b border-yellow-200"
        onClick={onOpenHerramientas}
      >
        <FaCog size={18} /> Herramientas
      </button>

      <button
        className="flex items-center gap-2 font-bold text-brown-900 py-3 px-4 hover:bg-yellow-100 transition text-base border-b border-yellow-200"
        onClick={() => setModalNuevo(true)}
      >
        <FaPlus size={18} /> Nuevo caso
      </button>

      {/* Casos recientes */}
      <div className="px-4 pt-3 pb-1 text-[15px] font-semibold text-brown-900">
        Casos recientes
      </div>

      <div className="flex-1 overflow-y-auto px-2 min-h-0">
        {chatsVisibles.length === 0 && (
          <div className="text-sm text-brown-400 px-1">
            Aún no has creado ningún caso.
          </div>
        )}

        {chatsVisibles.map((c) => (
          <div
            key={c.id}
            className={`flex items-center px-2 py-2 mb-1 rounded-lg cursor-pointer transition
              ${
                casoActivo === c.id
                  ? "bg-yellow-200 font-bold"
                  : "hover:bg-yellow-100"
              }`}
            style={{ fontSize: 16 }}
            onClick={() => seleccionarCaso(c.id)}
            title={c.nombre}
          >
            <span className="mr-2">💬</span>

            {editId === c.id ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleRenombrar(c.id, editNombre);
                }}
                className="flex-1 flex items-center"
              >
                <input
                  className="border-b border-yellow-600 bg-transparent px-1 text-brown-900 w-full"
                  value={editNombre}
                  autoFocus
                  onChange={(e) => setEditNombre(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") {
                      setEditId("");
                      setEditNombre("");
                    }
                  }}
                  maxLength={36}
                />
                <button
                  type="submit"
                  className="ml-1 text-green-700"
                  aria-label="Guardar nombre"
                >
                  <FaEdit />
                </button>
              </form>
            ) : (
              <>
                <span
                  className="flex-1 truncate"
                  onDoubleClick={() => {
                    setEditId(c.id);
                    setEditNombre(c.nombre);
                  }}
                >
                  {c.nombre}
                </span>

                <button
                  className="ml-2 text-yellow-900 hover:text-yellow-700"
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditId(c.id);
                    setEditNombre(c.nombre);
                  }}
                  aria-label="Renombrar"
                  title="Renombrar"
                >
                  <FaEdit size={16} />
                </button>

                <button
                  className="ml-1 text-red-700 hover:text-red-900"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteId(c.id);
                    setDeleteFinal(false);
                  }}
                  aria-label="Enviar a papelera"
                  title="Eliminar"
                >
                  <FaTrash size={16} />
                </button>
              </>
            )}
          </div>
        ))}

        {/* Papelera */}
        {chatsPapelera.length > 0 && (
          <>
            <div className="px-1 pt-4 pb-1 text-yellow-700 font-semibold flex items-center gap-1">
              <FaRecycle /> Papelera
            </div>
            {chatsPapelera.map((c) => (
              <div
                key={c.id}
                className="flex items-center px-2 py-2 mb-1 rounded-lg bg-yellow-100 text-yellow-800"
                style={{ fontSize: 16, opacity: 0.8 }}
              >
                <span className="mr-2">💬</span>
                <span className="flex-1 truncate">{c.nombre}</span>

                <button
                  className="ml-1 text-green-800 hover:text-green-900"
                  onClick={() => handleRestaurar(c.id)}
                  aria-label="Restaurar"
                  title="Restaurar"
                >
                  <FaRecycle size={16} />
                </button>

                <button
                  className="ml-1 text-red-700 hover:text-red-900"
                  onClick={() => {
                    setDeleteId(c.id);
                    setDeleteFinal(true);
                  }}
                  aria-label="Eliminar definitivamente"
                  title="Eliminar definitivamente"
                >
                  <FaTrash size={16} />
                </button>
              </div>
            ))}
          </>
        )}
      </div>

      {/* Footer usuario */}
      <div className="flex items-center px-4 py-3 border-t border-yellow-200 bg-yellow-50 mt-auto">
        <div className="rounded-full bg-yellow-700 text-white flex items-center justify-center w-8 h-8 mr-2">
          <FaUser size={18} />
        </div>
        <div>
          <div className="font-bold text-brown-900">
            {user.nombre || "Invitado"}
          </div>
          <div className="text-xs text-yellow-800">
            {user.pro ? "Acceso PRO" : "Acceso Básico"}
          </div>
        </div>
      </div>
    </>
  );

  /* ============================================================
     RENDER RESPONSIVE
     - Desktop: sidebar fijo (siempre renderizado)
     - Móvil: pantalla completa modal SOLO si isOpen === true
  ============================================================ */

  return (
    <>
      {/* DESKTOP (>=lg): sidebar fijo */}
      <aside
        className="
          hidden lg:flex lg:flex-col
          lg:w-[300px] lg:flex-shrink-0
          lg:h-[100dvh]
          lg:border-r lg:border-yellow-200
          lg:bg-white lg:text-[#5C2E0B]
          lg:shadow-none
        "
      >
        {/* En desktop no hay header propio, el contenido arranca directo */}
        <div className="flex flex-col min-h-0 flex-1">{ListaContenido}</div>
      </aside>

      {/* MÓVIL (<lg): hoja a pantalla completa */}
      {isOpen && (
        <div
          className="
            fixed inset-0 z-[200] lg:hidden
            flex flex-col bg-white text-[#5C2E0B]
            shadow-2xl
          "
        >
          {/* Header móvil fijo */}
          <div
            className="
              flex items-center justify-between
              px-4 h-12 flex-shrink-0
              border-b border-yellow-200
              bg-yellow-50
              text-[#5C2E0B] font-semibold
            "
          >
            <span className="text-[15px] font-bold">Mis casos</span>
            <button
              onClick={onCloseSidebar}
              className="text-[#5C2E0B] text-xl font-bold p-1"
              aria-label="Cerrar panel"
            >
              <FaTimes />
            </button>
          </div>

          {/* Contenido scrollable debajo del header */}
          <div className="flex-1 min-h-0 overflow-y-auto flex flex-col">
            {ListaContenido}
          </div>
        </div>
      )}

      {/* MODALES (para ambos modos) */}
      <Modal open={modalNuevo} onClose={() => setModalNuevo(false)}>
        <form onSubmit={handleNuevoChat}>
          <div className="font-bold text-lg text-yellow-900 mb-3">
            ¿Nuevo Caso?
          </div>
          <div className="text-brown-800 mb-2 text-sm">
            Cada caso conserva su chat y archivos asociados.
          </div>
          <input
            className="border rounded px-2 py-1 w-full mb-3"
            placeholder="Nombre del caso"
            value={nombreNuevo}
            maxLength={40}
            autoFocus
            onChange={(e) => setNombreNuevo(e.target.value)}
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

      <Modal open={!!deleteId} onClose={() => setDeleteId("")}>
        <div className="font-bold text-lg text-yellow-900 mb-3">
          {deleteFinal ? "Eliminar definitivamente" : "Eliminar caso"}
        </div>
        <div className="mb-4 text-brown-800 text-sm">
          {deleteFinal
            ? "¿Seguro que deseas eliminar este caso de forma permanente? Esta acción no se puede deshacer."
            : "¿Seguro que deseas eliminar este caso? Podrás restaurarlo desde la papelera."}
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
    </>
  );
}
