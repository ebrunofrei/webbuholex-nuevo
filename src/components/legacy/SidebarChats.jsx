/* ============================================================
   📂 SidebarChats — Refactor FULL
   ------------------------------------------------------------
   - Lista unificada de casos + chats
   - Persistencia por usuario
   - Acciones: crear, renombrar, eliminar, restaurar
   - Menú contextual con tres puntos
============================================================ */

import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
} from "react";

import {
  FaHome,
  FaPlus,
  FaEdit,
  FaTrash,
  FaRecycle,
  FaCog,
  FaUser,
  FaTimes,
  FaEllipsisV,
} from "react-icons/fa";

/* -------------------------------------------------
   Util: ID único cortito
------------------------------------------------- */
const uuid = () =>
  "_" + Math.random().toString(36).slice(2, 11);

/* -------------------------------------------------
   Modal genérico reutilizable
------------------------------------------------- */
function Modal({ open, onClose, children }) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[400] flex items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl p-6 w-full max-w-xs relative border-2 border-yellow-700"
        onClick={(e) => e.stopPropagation()}
      >
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

/* -------------------------------------------------
   Helpers de storage con protección SSR
------------------------------------------------- */
const safeGetItem = (k, fb) => {
  if (typeof window === "undefined") return fb;
  try {
    return window.localStorage.getItem(k) ?? fb;
  } catch {
    return fb;
  }
};

const safeSetItem = (k, v) => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(k, v);
  } catch {}
};

const loadJsonArray = (k) => {
  try {
    const raw = safeGetItem(k, "[]");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

function migrateLegacyStorage({ CASOS_KEY, ACTIVO_KEY }) {
  const oldCasosKey = "litisbot_casos";
  const oldActivoKey = "litisbot_caso_activo";

  const hasNew =
    safeGetItem(CASOS_KEY) !== null ||
    safeGetItem(ACTIVO_KEY) !== null;

  if (hasNew) return;

  const legacyCasos = safeGetItem(oldCasosKey);
  const legacyActivo = safeGetItem(oldActivoKey);

  if (legacyCasos) {
    safeSetItem(CASOS_KEY, legacyCasos);
    window.localStorage.removeItem(oldCasosKey);
  }

  if (legacyActivo) {
    safeSetItem(ACTIVO_KEY, legacyActivo);
    window.localStorage.removeItem(oldActivoKey);
  }
}

/* ============================================================
   COMPONENTE PRINCIPAL
============================================================ */
export default function SidebarChats({
  onNuevoCaso,
  onNuevoChat,
  user = { nombre: "Invitado", uid: "", pro: false },
  setCasos: setCasosProp,
  setCasoActivo: setCasoActivoProp,
  onOpenHerramientas,
  isOpen = true,
  onCloseSidebar,
}) {
  /* Namespacing */
  const ns = useMemo(
    () => (user?.uid ? `litisbot:${user.uid}` : "litisbot:anon"),
    [user?.uid]
  );

  const CASOS_KEY = `${ns}:casos`;
  const ACTIVO_KEY = `${ns}:caso_activo`;

  /* Estados */
  const [casos, setCasos] = useState([]);
  const [casoActivo, setCasoActivo] = useState("");
  const [modalCrear, setModalCrear] = useState(false);
  const [nombreNuevo, setNombreNuevo] = useState("");

  const [editId, setEditId] = useState("");
  const [editNombre, setEditNombre] = useState("");

  const [deleteId, setDeleteId] = useState("");
  const [deletePermanent, setDeletePermanent] = useState(false);

  const [menuId, setMenuId] = useState(null);

  /* -------------------------------------------------
     Carga inicial
  ------------------------------------------------- */
  useEffect(() => {
    migrateLegacyStorage({ CASOS_KEY, ACTIVO_KEY });

    setCasos(loadJsonArray(CASOS_KEY));

    const activo = safeGetItem(ACTIVO_KEY, "");
    if (activo) setCasoActivo(activo);
  }, [CASOS_KEY, ACTIVO_KEY]);

  /* Persistencia */
  useEffect(() => {
    safeSetItem(CASOS_KEY, JSON.stringify(casos));
    setCasosProp?.(casos);
  }, [casos]);

  useEffect(() => {
    safeSetItem(ACTIVO_KEY, casoActivo);
    setCasoActivoProp?.(casoActivo);
  }, [casoActivo]);

  /* Validación de activo */
  useEffect(() => {
    if (!casos.length) {
      if (casoActivo) setCasoActivo("");
      return;
    }

    const ok = casos.some(
      (c) => c.id === casoActivo && !c.papelera
    );

    if (!ok) {
      const first = casos.find((c) => !c.papelera);
      setCasoActivo(first?.id || "");
    }
  }, [casos, casoActivo]);

  /* ========================================================
     ACCIONES
  ======================================================== */

  const crearCaso = useCallback(
    (e) => {
      e?.preventDefault?.();

      const nombre =
        (nombreNuevo || "").trim() || "Nuevo caso";

      const nuevo = {
        id: uuid(),
        nombre,
        tipo: "caso",
        papelera: false,
        creadoEn: Date.now(),
      };

      setCasos((p) => [nuevo, ...p]);
      setCasoActivo(nuevo.id);

      setModalCrear(false);
      setNombreNuevo("");

      onNuevoCaso?.(nuevo);
      onCloseSidebar?.();
    },
    [nombreNuevo]
  );

  const crearChat = useCallback(() => {
    const nuevo = {
      id: uuid(),
      nombre: "Nuevo chat",
      tipo: "chat",
      papelera: false,
      creadoEn: Date.now(),
    };

    setCasos((p) => [nuevo, ...p]);
    setCasoActivo(nuevo.id);

    onNuevoChat?.(nuevo);
    onCloseSidebar?.();
  }, []);

  const seleccionar = useCallback((id) => {
    setCasoActivo(id);
    setMenuId(null);
    onCloseSidebar?.();
  }, []);

  const renombrar = useCallback((id, nombre) => {
    const limpio = (nombre || "").trim();
    if (!limpio) return;

    setCasos((p) =>
      p.map((c) =>
        c.id === id ? { ...c, nombre: limpio } : c
      )
    );

    setEditId("");
    setEditNombre("");
    setMenuId(null);
  }, []);

  const eliminar = useCallback(
    (id, permanente = false) => {
      if (permanente) {
        setCasos((p) => p.filter((c) => c.id !== id));
      } else {
        setCasos((p) =>
          p.map((c) =>
            c.id === id ? { ...c, papelera: true } : c
          )
        );
      }

      if (casoActivo === id) setCasoActivo("");
      setDeleteId("");
      setMenuId(null);
    },
    [casoActivo]
  );

  const restaurar = useCallback((id) => {
    setCasos((p) =>
      p.map((c) =>
        c.id === id ? { ...c, papelera: false } : c
      )
    );
  }, []);

  /* -------------------------------------------------
     DERIVADOS
  ------------------------------------------------- */
  const activos = casos.filter((c) => !c.papelera);
  const papelera = casos.filter((c) => c.papelera);

  /* ============================================================
     RENDER LISTA
  ============================================================ */
  const renderContenidoLista = () => (
    <>
      {/* Navegación principal */}
      <button
        className="flex items-center gap-2 font-bold text-brown-900 py-3 px-4 hover:bg-yellow-100 border-b"
        onClick={() => (window.location.href = "/")}
      >
        <FaHome size={20} /> Home
      </button>

      <button
        className="flex items-center gap-2 font-bold text-brown-900 py-3 px-4 hover:bg-yellow-100 border-b"
        onClick={onOpenHerramientas}
      >
        <FaCog size={18} /> Herramientas
      </button>

      {/* Crear caso */}
      <button
        className="flex items-center gap-2 font-bold text-brown-900 py-3 px-4 hover:bg-yellow-100 border-b"
        onClick={() => setModalCrear(true)}
      >
        <FaPlus size={20} /> Nuevo caso
      </button>

      {/* Crear chat */}
      <button
        className="flex items-center gap-2 font-bold text-brown-900 py-3 px-4 hover:bg-yellow-100 border-b"
        onClick={crearChat}
      >
        <FaPlus size={20} /> Nuevo chat
      </button>

      <div className="px-4 pt-3 pb-1 text-[15px] font-semibold text-brown-900">
        Casos y chats recientes
      </div>

      <div className="flex-1 overflow-y-auto px-2 min-h-0">
        {!activos.length && (
          <div className="text-sm text-brown-400 px-1">
            Aún no has creado nada.
          </div>
        )}

        {/* -----------------------------------------------------
           LISTA PRINCIPAL
        ----------------------------------------------------- */}
        {activos.map((c) => {
          const activo = casoActivo === c.id;
          const icono = c.tipo === "chat" ? "💬" : "📂";

          return (
            <div
              key={c.id}
              className={`relative flex items-center px-2 py-2 mb-1 rounded-lg cursor-pointer transition
                ${
                  activo
                    ? "bg-yellow-200 font-bold"
                    : "hover:bg-yellow-100"
                }`}
              style={{ fontSize: 16 }}
              onClick={() => seleccionar(c.id)}
            >
              <span className="mr-2">{icono}</span>

              {/* MODO EDICIÓN */}
              {editId === c.id ? (
                <form
                  className="flex-1 flex items-center"
                  onSubmit={(e) => {
                    e.preventDefault();
                    renombrar(c.id, editNombre);
                  }}
                >
                  <input
                    className="border-b border-yellow-600 bg-transparent px-1 text-brown-900 w-full"
                    value={editNombre}
                    autoFocus
                    maxLength={50}
                    onChange={(e) =>
                      setEditNombre(e.target.value)
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Escape") {
                        setEditId("");
                        setEditNombre("");
                      }
                    }}
                  />
                  <button className="ml-1 text-green-700">
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

                  {/* MENÚ ⋮ */}
                  <div className="relative">
                    <button
                      className="ml-2 p-1 text-yellow-900 hover:text-yellow-700"
                      onClick={(e) => {
                        e.stopPropagation();
                        setMenuId(
                          menuId === c.id ? null : c.id
                        );
                      }}
                    >
                      <FaEllipsisV size={13} />
                    </button>

                    {menuId === c.id && (
                      <div
                        className="
                          absolute right-0 mt-1 w-40 bg-white
                          border border-yellow-200 rounded-lg shadow-lg z-10
                        "
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-yellow-50"
                          onClick={() => {
                            setEditId(c.id);
                            setEditNombre(c.nombre);
                            setMenuId(null);
                          }}
                        >
                          <FaEdit size={13} /> Renombrar
                        </button>

                        <button
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-700 hover:bg-red-50"
                          onClick={() => {
                            setDeleteId(c.id);
                            setDeletePermanent(false);
                            setMenuId(null);
                          }}
                        >
                          <FaTrash size={13} /> Eliminar
                        </button>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          );
        })}

        {/* -----------------------------------------------------
           PAPELERA
        ----------------------------------------------------- */}
        {papelera.length > 0 && (
          <>
            <div className="px-1 pt-4 pb-1 text-yellow-700 font-semibold flex items-center gap-1">
              <FaRecycle /> Papelera
            </div>

            {papelera.map((c) => (
              <div
                key={c.id}
                className="flex items-center px-2 py-2 mb-1 rounded-lg bg-yellow-100 text-yellow-800"
                style={{ fontSize: 16 }}
              >
                <span className="mr-2">
                  {c.tipo === "chat" ? "💬" : "📂"}
                </span>

                <span className="flex-1 truncate">
                  {c.nombre}
                </span>

                <button
                  className="ml-1 text-green-800 hover:text-green-900"
                  onClick={() => restaurar(c.id)}
                >
                  <FaRecycle size={16} />
                </button>

                <button
                  className="ml-1 text-red-700 hover:text-red-900"
                  onClick={() => {
                    setDeleteId(c.id);
                    setDeletePermanent(true);
                  }}
                >
                  <FaTrash size={16} />
                </button>
              </div>
            ))}
          </>
        )}
      </div>

      {/* FOOTER USUARIO */}
      <div className="flex items-center px-4 py-3 border-t border-yellow-200 bg-yellow-50 mt-auto">
        <div className="rounded-full bg-yellow-700 text-white flex items-center justify-center w-8 h-8 mr-2">
          <FaUser size={18} />
        </div>

        <div>
          <div className="font-bold text-brown-900">
            {user.nombre}
          </div>
          <div className="text-xs text-yellow-800">
            {user.pro ? "Acceso PRO" : "Acceso Básico"}
          </div>
        </div>
      </div>
    </>
  );

  /* ============================================================
     RENDER RESPONSIVE FINAL
  ============================================================ */
  return (
    <>
      {/* DESKTOP */}
      <aside className="hidden lg:flex flex-col w-[300px] h-[100dvh] border-r border-yellow-200 bg-white text-[#5C2E0B]">
        {renderContenidoLista()}
      </aside>

      {/* MOBILE */}
      {isOpen && (
        <div className="fixed inset-0 z-[200] lg:hidden flex flex-col bg-white shadow-2xl">
          <div className="flex items-center justify-between px-4 h-12 border-b bg-yellow-50">
            <span className="font-semibold text-[15px]">
              Mis casos y chats
            </span>
            <button
              onClick={onCloseSidebar}
              className="text-xl font-bold"
            >
              <FaTimes />
            </button>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto">
            {renderContenidoLista()}
          </div>
        </div>
      )}

      {/* MODAL CREAR CASO */}
      <Modal
        open={modalCrear}
        onClose={() => setModalCrear(false)}
      >
        <form onSubmit={crearCaso}>
          <div className="font-bold text-lg mb-3 text-yellow-900">
            ¿Nuevo Caso?
          </div>

          <input
            className="border rounded px-2 py-1 w-full mb-3"
            placeholder="Nombre del caso"
            value={nombreNuevo}
            autoFocus
            maxLength={50}
            onChange={(e) => setNombreNuevo(e.target.value)}
          />

          <button
            type="submit"
            disabled={!nombreNuevo.trim()}
            className="w-full py-2 bg-yellow-700 text-white font-bold rounded hover:bg-yellow-800"
          >
            Crear caso
          </button>
        </form>
      </Modal>

      {/* MODAL ELIMINAR */}
      <Modal open={!!deleteId} onClose={() => setDeleteId("")}>
        <div className="font-bold text-lg mb-3 text-yellow-900">
          {deletePermanent
            ? "Eliminar definitivamente"
            : "Eliminar caso/chat"}
        </div>

        <div className="text-sm mb-4 text-brown-800">
          {deletePermanent
            ? "Esta acción no se puede deshacer."
            : "Podrás restaurarlo desde la papelera."}
        </div>

        <div className="flex gap-2">
          <button
            className="flex-1 py-2 bg-yellow-700 text-white rounded font-bold hover:bg-yellow-900"
            onClick={() => eliminar(deleteId, deletePermanent)}
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
