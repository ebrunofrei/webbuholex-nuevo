// src/components/SidebarChats.jsx

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
} from "react-icons/fa";

/* -------------------------------------------------
   Util: ID único cortito
------------------------------------------------- */
function uuid() {
  return "_" + Math.random().toString(36).slice(2, 11);
}

/* -------------------------------------------------
   Modal genérico reutilizable
------------------------------------------------- */
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

/* -------------------------------------------------
   Helpers de storage con protección SSR
------------------------------------------------- */
function safeGetItem(key, fallback = null) {
  if (typeof window === "undefined") return fallback;
  try {
    return window.localStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
}

function safeSetItem(key, value) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* swallow */
  }
}

/**
 * Carga array JSON del storage. Si está corrupto => []
 */
function loadJsonArray(key) {
  const raw = safeGetItem(key, "[]");
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Migra claves legacy a las nuevas con namespace de usuario,
 * SOLO si las nuevas aún no existen.
 */
function migrateLegacyStorage({ CASOS_KEY, ACTIVO_KEY }) {
  const oldCasosKey = "litisbot_casos";
  const oldActivoKey = "litisbot_caso_activo";

  const yaTieneNuevos =
    safeGetItem(CASOS_KEY) !== null ||
    safeGetItem(ACTIVO_KEY) !== null;

  if (yaTieneNuevos) return;

  const legacyCasos = safeGetItem(oldCasosKey);
  const legacyActivo = safeGetItem(oldActivoKey);

  if (legacyCasos) {
    safeSetItem(CASOS_KEY, legacyCasos);
    // borramos legacy
    safeSetItem(oldCasosKey, "");
    window.localStorage.removeItem(oldCasosKey);
  }

  if (legacyActivo) {
    safeSetItem(ACTIVO_KEY, legacyActivo);
    safeSetItem(oldActivoKey, "");
    window.localStorage.removeItem(oldActivoKey);
  }
}

/* -------------------------------------------------
   SidebarChats
   - Desktop (lg+): fijo a la izquierda
   - Mobile (<lg): pantalla completa tipo drawer
------------------------------------------------- */
export default function SidebarChats({
  user = { nombre: "Invitado", pro: false, uid: "" },

  // setters que le contamos al padre
  setCasos: setCasosProp,
  setCasoActivo: setCasoActivoProp,

  // abre el modal de herramientas globales
  onOpenHerramientas,

  // visibilidad en mobile
  isOpen = true,
  onCloseSidebar,
}) {
  /* -------------------------------------------------
     Namespacing por usuario para localStorage
  ------------------------------------------------- */
  const ns = useMemo(
    () => (user?.uid ? `litisbot:${user.uid}` : "litisbot:anon"),
    [user?.uid]
  );
  const CASOS_KEY = `${ns}:casos`;
  const ACTIVO_KEY = `${ns}:caso_activo`;

  /* -------------------------------------------------
     Estado principal
  ------------------------------------------------- */
  const [casos, setCasos] = useState([]);
  const [casoActivo, setCasoActivo] = useState("");

  // UI state interno
  const [modalCrearCaso, setModalCrearCaso] = useState(false);
  const [nombreNuevoCaso, setNombreNuevoCaso] = useState("");

  const [editId, setEditId] = useState("");
  const [editNombre, setEditNombre] = useState("");

  const [deleteId, setDeleteId] = useState("");
  const [deleteDefinitivo, setDeleteDefinitivo] = useState(false);

  /* -------------------------------------------------
     Carga inicial en cliente + migración
  ------------------------------------------------- */
  useEffect(() => {
    // migración legacy -> nuevas keys
    migrateLegacyStorage({ CASOS_KEY, ACTIVO_KEY });

    // cargar casos guardados
    const guardados = loadJsonArray(CASOS_KEY);
    setCasos(guardados);

    // cargar caso activo
    const activoGuardado = safeGetItem(ACTIVO_KEY, "");
    if (activoGuardado) {
      setCasoActivo(activoGuardado);
    }
  }, [CASOS_KEY, ACTIVO_KEY]);

  /* -------------------------------------------------
     Persistencia reactiva hacia localStorage
     + sincronizar hacia el padre
  ------------------------------------------------- */
  useEffect(() => {
    // persistimos cambios de la lista de casos
    safeSetItem(CASOS_KEY, JSON.stringify(casos));
    // avisamos al padre
    setCasosProp?.(casos);
  }, [casos, CASOS_KEY, setCasosProp]);

  useEffect(() => {
    // persistimos el ID del caso activo
    safeSetItem(ACTIVO_KEY, casoActivo);
    // avisamos al padre
    setCasoActivoProp?.(casoActivo);
  }, [casoActivo, ACTIVO_KEY, setCasoActivoProp]);

  /* -------------------------------------------------
     Garantizar que el casoActivo siempre apunte a uno válido.
     - si borro uno, o lo mando a papelera, el activo debe moverse
  ------------------------------------------------- */
  useEffect(() => {
    // no hay casos en absoluto
    if (!casos.length) {
      if (casoActivo) setCasoActivo("");
      return;
    }

    // si el activo actual no existe o está en papelera => elegir otro
    const sigueSiendoValido = casos.some(
      (c) => c.id === casoActivo && !c.papelera
    );

    if (!sigueSiendoValido) {
      const firstDisponible = casos.find((c) => !c.papelera);
      if (firstDisponible) {
        setCasoActivo(firstDisponible.id);
      } else {
        setCasoActivo("");
      }
    }
  }, [casos, casoActivo]);

  /* -------------------------------------------------
     Acciones de negocio
  ------------------------------------------------- */

  // Crea un NUEVO CASO persistente
  const handleCrearCaso = useCallback(
    (e) => {
      e?.preventDefault?.();

      const nombre = (nombreNuevoCaso || "").trim() || "Nuevo caso";

      const nuevoCaso = {
        id: uuid(),
        nombre,
        papelera: false,
        creadoEn: Date.now(),
      };

      setCasos((prev) => [nuevoCaso, ...prev]);
      setCasoActivo(nuevoCaso.id);

      // limpiar estado modal
      setNombreNuevoCaso("");
      setModalCrearCaso(false);

      // en mobile cierro el drawer
      onCloseSidebar?.();
    },
    [nombreNuevoCaso, onCloseSidebar]
  );

  // (futuro) chat rápido temporal SIN persistirlo en lista de casos
  // podría seteársele un casoActivo "tmp-<timestamp>" y NO lo guardamos en `casos`.
  const handleCrearChatRapido = useCallback(() => {
    const chatId = `tmp-${Date.now()}`;
    setCasoActivo(chatId);
    onCloseSidebar?.();
  }, [onCloseSidebar]);

  const handleSeleccionarCaso = useCallback(
    (id) => {
      setCasoActivo(id);
      onCloseSidebar?.();
    },
    [onCloseSidebar]
  );

  const handleRenombrar = useCallback((id, nuevoNombre) => {
    const limpio = (nuevoNombre || "").trim();
    if (!limpio) return;

    setCasos((prev) =>
      prev.map((c) => (c.id === id ? { ...c, nombre: limpio } : c))
    );

    setEditId("");
    setEditNombre("");
  }, []);

  const handleEliminar = useCallback((id, permanente = false) => {
    if (permanente) {
      // eliminar definitivo
      setCasos((prev) => prev.filter((c) => c.id !== id));
    } else {
      // mandar a papelera
      setCasos((prev) =>
        prev.map((c) => (c.id === id ? { ...c, papelera: true } : c))
      );
    }

    setDeleteId("");
    if (casoActivo === id) setCasoActivo("");
  }, [casoActivo]);

  const handleRestaurar = useCallback((id) => {
    setCasos((prev) =>
      prev.map((c) => (c.id === id ? { ...c, papelera: false } : c))
    );
  }, []);

  /* -------------------------------------------------
     Derivados
  ------------------------------------------------- */
  const casosActivos = useMemo(
    () => casos.filter((c) => !c.papelera),
    [casos]
  );

  const casosEnPapelera = useMemo(
    () => casos.filter((c) => c.papelera),
    [casos]
  );

  /* -------------------------------------------------
     Render chunk principal de la lista (botones + casos)
     Lo definimos como función para no tener una mega variable JSX
  ------------------------------------------------- */
  const renderContenidoLista = () => (
    <>
      {/* Atajos de navegación / acciones principales */}
      <button
        className="flex items-center gap-2 font-bold text-brown-900 py-3 px-4 hover:bg-yellow-100 transition text-base border-b border-yellow-200"
        onClick={() => {
          if (typeof window !== "undefined") {
            window.location.href = "/";
          }
        }}
      >
        <FaHome size={20} /> Home
      </button>

      <button
        className="flex items-center gap-2 font-bold text-brown-900 py-3 px-4 hover:bg-yellow-100 transition text-base border-b border-yellow-200"
        onClick={onOpenHerramientas}
      >
        <FaCog size={18} /> Herramientas
      </button>

      {/* 🔥 Aquí en el futuro podrías mostrar dos botones:
         - "Nuevo chat" (temporal)
         - "Nuevo caso" (persistente)
         Por ahora dejamos sólo "Nuevo caso" para no romper tu UX.
      */}
      <button
        className="flex items-center gap-2 font-bold text-brown-900 py-3 px-4 hover:bg-yellow-100 transition text-base border-b border-yellow-200"
        onClick={() => setModalCrearCaso(true)}
      >
        <FaPlus size={18} /> Nuevo caso
      </button>

      {/* <button
        className="flex items-center gap-2 font-bold text-brown-900 py-3 px-4 hover:bg-yellow-100 transition text-base border-b border-yellow-200"
        onClick={handleCrearChatRapido}
      >
        <FaPlus size={18} /> Nuevo chat
      </button> */}

      {/* Casos recientes */}
      <div className="px-4 pt-3 pb-1 text-[15px] font-semibold text-brown-900">
        Casos recientes
      </div>

      <div className="flex-1 overflow-y-auto px-2 min-h-0">
        {casosActivos.length === 0 && (
          <div className="text-sm text-brown-400 px-1">
            Aún no has creado ningún caso.
          </div>
        )}

        {casosActivos.map((c) => {
          const activo = casoActivo === c.id;

          return (
            <div
              key={c.id}
              className={`flex items-center px-2 py-2 mb-1 rounded-lg cursor-pointer transition
                ${
                  activo
                    ? "bg-yellow-200 font-bold"
                    : "hover:bg-yellow-100"
                }`}
              style={{ fontSize: 16 }}
              title={c.nombre}
              onClick={() => handleSeleccionarCaso(c.id)}
            >
              <span className="mr-2">💬</span>

              {/* modo edición nombre */}
              {editId === c.id ? (
                <form
                  className="flex-1 flex items-center"
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleRenombrar(c.id, editNombre);
                  }}
                >
                  <input
                    className="border-b border-yellow-600 bg-transparent px-1 text-brown-900 w-full"
                    value={editNombre}
                    autoFocus
                    maxLength={36}
                    onChange={(e) => setEditNombre(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Escape") {
                        setEditId("");
                        setEditNombre("");
                      }
                    }}
                  />
                  <button
                    type="submit"
                    className="ml-1 text-green-700"
                    aria-label="Guardar nombre"
                    title="Guardar nombre"
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
                    aria-label="Renombrar"
                    title="Renombrar"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditId(c.id);
                      setEditNombre(c.nombre);
                    }}
                  >
                    <FaEdit size={16} />
                  </button>

                  <button
                    className="ml-1 text-red-700 hover:text-red-900"
                    aria-label="Enviar a papelera"
                    title="Eliminar"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteId(c.id);
                      setDeleteDefinitivo(false);
                    }}
                  >
                    <FaTrash size={16} />
                  </button>
                </>
              )}
            </div>
          );
        })}

        {/* Papelera */}
        {casosEnPapelera.length > 0 && (
          <>
            <div className="px-1 pt-4 pb-1 text-yellow-700 font-semibold flex items-center gap-1">
              <FaRecycle /> Papelera
            </div>

            {casosEnPapelera.map((c) => (
              <div
                key={c.id}
                className="flex items-center px-2 py-2 mb-1 rounded-lg bg-yellow-100 text-yellow-800"
                style={{ fontSize: 16, opacity: 0.8 }}
              >
                <span className="mr-2">💬</span>
                <span className="flex-1 truncate">{c.nombre}</span>

                <button
                  className="ml-1 text-green-800 hover:text-green-900"
                  aria-label="Restaurar"
                  title="Restaurar"
                  onClick={() => handleRestaurar(c.id)}
                >
                  <FaRecycle size={16} />
                </button>

                <button
                  className="ml-1 text-red-700 hover:text-red-900"
                  aria-label="Eliminar definitivamente"
                  title="Eliminar definitivamente"
                  onClick={() => {
                    setDeleteId(c.id);
                    setDeleteDefinitivo(true);
                  }}
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

  /* -------------------------------------------------
     Render responsive final
  ------------------------------------------------- */
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
        "
      >
        {/* en desktop arranca directo sin header */}
        <div className="flex flex-col min-h-0 flex-1">
          {renderContenidoLista()}
        </div>
      </aside>

      {/* MOBILE (<lg): drawer pantalla completa */}
      {isOpen && (
        <div
          className="
            fixed inset-0 z-[200] lg:hidden
            flex flex-col bg-white text-[#5C2E0B]
            shadow-2xl
          "
        >
          {/* header móvil */}
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

          {/* contenido scrolleable */}
          <div className="flex-1 min-h-0 overflow-y-auto flex flex-col">
            {renderContenidoLista()}
          </div>
        </div>
      )}

      {/* MODAL: crear caso */}
      <Modal
        open={modalCrearCaso}
        onClose={() => setModalCrearCaso(false)}
      >
        <form onSubmit={handleCrearCaso}>
          <div className="font-bold text-lg text-yellow-900 mb-3">
            ¿Nuevo Caso?
          </div>
          <div className="text-brown-800 mb-2 text-sm">
            Cada caso conserva su chat y archivos asociados.
          </div>

          <input
            className="border rounded px-2 py-1 w-full mb-3"
            placeholder="Nombre del caso"
            value={nombreNuevoCaso}
            maxLength={40}
            autoFocus
            onChange={(e) => setNombreNuevoCaso(e.target.value)}
          />

          <button
            type="submit"
            className="
              w-full py-2 bg-yellow-700 text-white font-bold rounded shadow
              hover:bg-yellow-800 transition
            "
            disabled={!nombreNuevoCaso.trim()}
          >
            Crear caso
          </button>

          {/* en el futuro:
          <button
            type="button"
            className="
              w-full mt-2 py-2 bg-yellow-100 text-yellow-900 font-bold rounded
              border border-yellow-600
            "
            onClick={() => {
              handleCrearChatRapido();
              setModalCrearCaso(false);
            }}
          >
            Chat rápido (sin guardar)
          </button>
          */}
        </form>
      </Modal>

      {/* MODAL: confirmar eliminación */}
      <Modal
        open={!!deleteId}
        onClose={() => setDeleteId("")}
      >
        <div className="font-bold text-lg text-yellow-900 mb-3">
          {deleteDefinitivo
            ? "Eliminar definitivamente"
            : "Eliminar caso"}
        </div>

        <div className="mb-4 text-brown-800 text-sm">
          {deleteDefinitivo
            ? "¿Seguro que deseas eliminar este caso de forma permanente? Esta acción no se puede deshacer."
            : "¿Seguro que deseas eliminar este caso? Podrás restaurarlo desde la papelera."}
        </div>

        <div className="flex gap-2">
          <button
            className="
              flex-1 py-2 bg-yellow-700 text-white rounded font-bold
              hover:bg-yellow-900
            "
            onClick={() => handleEliminar(deleteId, deleteDefinitivo)}
          >
            Sí, eliminar
          </button>

          <button
            className="
              flex-1 py-2 bg-gray-200 rounded font-bold
              hover:bg-gray-300
            "
            onClick={() => setDeleteId("")}
          >
            Cancelar
          </button>
        </div>
      </Modal>
    </>
  );
}
