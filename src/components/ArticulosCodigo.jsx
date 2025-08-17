import React, { useEffect, useState } from "react";
import { obtenerArticulosPorCodigo, editarArticulo, eliminarArticulo } from "@/services/firebaseCodigosService";
import ModalEditarArticulo from "../admin/ModalEditarArticulo";
import { useUserAdminStatus } from "../hooks/useUserAdminStatus";
import toast, { Toaster } from "react-hot-toast";

/**
 * Componente para mostrar artículos de un código legal.
 * @param {string} codigoId - ID del código legal en Firestore (ej: "CODIGO_CIVIL")
 */
const ArticulosCodigo = ({ codigoId }) => {
  const [articulos, setArticulos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [articuloActual, setArticuloActual] = useState(null);
  const isAdmin = useUserAdminStatus();

  // Cargar artículos
  const recargarArticulos = async () => {
    setLoading(true);
    const res = await obtenerArticulosPorCodigo(codigoId);
    setArticulos(res);
    setLoading(false);
  };

  useEffect(() => {
    recargarArticulos();
    // eslint-disable-next-line
  }, [codigoId]);

  // Guardar edición real
  const handleGuardarEdicion = async (articuloEditado) => {
    try {
      await editarArticulo(codigoId, articuloEditado.id, {
        ...articuloEditado,
        fecha_actualizacion: articuloEditado.fecha_actualizacion || new Date().toISOString().substring(0, 10),
      });
      setModalOpen(false);
      toast.success("Artículo guardado correctamente.");
      recargarArticulos();
    } catch (err) {
      toast.error("Error al guardar el artículo.");
    }
  };

  // Eliminar real
  const handleEliminarArticulo = async (articuloAEliminar) => {
    try {
      await eliminarArticulo(codigoId, articuloAEliminar.id);
      setModalOpen(false);
      toast.success("Artículo eliminado correctamente.");
      recargarArticulos();
    } catch (err) {
      toast.error("Error al eliminar el artículo.");
    }
  };

  // Abrir modal sólo admin
  const handleEditar = (articulo) => {
    if (!isAdmin) {
      toast.error("No tienes permisos de administrador para editar artículos.");
      return;
    }
    setArticuloActual(articulo);
    setModalOpen(true);
  };

  if (loading) return <div>Cargando artículos...</div>;
  if (!articulos.length) return <div>No se encontraron artículos.</div>;

  return (
    <div className="space-y-4">
      <Toaster position="top-center" />
      {/* Banner admin/lectura */}
      {isAdmin ? (
        <div className="mb-4 rounded-xl bg-white border-l-8 border-[#7a2518] p-3 text-[#7a2518] font-semibold shadow">
          👑 Estás en modo <b>Administrador</b>: puedes editar y eliminar artículos.
        </div>
      ) : (
        <div className="mb-4 rounded-xl bg-white border-l-8 border-[#3e2723] p-3 text-[#3e2723] font-semibold shadow">
          ⚠️ Estás en modo <b>Lectura</b>: no tienes privilegios para editar o eliminar artículos.
        </div>
      )}

      {articulos.map(art => (
        <div
          key={art.id}
          className="rounded-xl border border-[#3e2723] p-4 shadow bg-white flex flex-col md:flex-row md:items-center justify-between"
        >
          <div className="flex-1">
            <h2 className="text-lg font-bold text-[#7a2518]">
              {art.titulo}
            </h2>
            <div className="text-gray-800 whitespace-pre-line mb-2">
              {art.texto}
            </div>
            {art.estadoVigencia && (
              <span className="text-xs bg-[#7a2518] text-white px-2 py-1 rounded mr-2">
                {art.estadoVigencia}
              </span>
            )}
            {art.fecha_actualizacion && (
              <span className="text-xs text-[#3e2723] ml-2">
                Actualizado: {art.fecha_actualizacion}
              </span>
            )}
          </div>
          {/* Botón Editar sólo para admin */}
          {isAdmin && (
            <button
              onClick={() => handleEditar(art)}
              className="mt-3 md:mt-0 md:ml-4 px-4 py-2 rounded-xl bg-[#7a2518] hover:bg-[#3e2723] text-white font-bold transition"
            >
              Editar
            </button>
          )}
        </div>
      ))}

      {/* Modal de edición */}
      {modalOpen && articuloActual && (
        <ModalEditarArticulo
          articulo={articuloActual}
          onClose={() => setModalOpen(false)}
          onSave={handleGuardarEdicion}
          onDelete={handleEliminarArticulo}
          isAdmin={isAdmin}
        />
      )}
    </div>
  );
};

export default ArticulosCodigo;
