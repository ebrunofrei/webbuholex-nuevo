import React, { useEffect, useState } from "react";
import {
  obtenerLibrosDigitales,
  publicarLibroDigital,
  subirArchivoLibro,
  editarLibroDigital,
  eliminarLibroDigital,
  buscarLibrosAvanzado
} from "@/services/firebaseBibliotecaService";
import SubirLibroModal from "@/components/Biblioteca/SubirLibroModal";
import EditarLibroModal from "@/components/Biblioteca/EditarLibroModal";
import VisorLibroModal from "@/components/Biblioteca/VisorLibroModal";
import { useUserAdminStatus } from "@/hooks/useUserAdminStatus";
import toast, { Toaster } from "react-hot-toast";
import PageContainer from "@/components/PageContainer";

export default function Biblioteca() {
  // Hook admin completo
  const { user, isAdmin, checking } = useUserAdminStatus();

  // Estado de UI
  const [libros, setLibros] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editarModal, setEditarModal] = useState(false);
  const [visorLibro, setVisorLibro] = useState(null);
  const [libroActual, setLibroActual] = useState(null);
  const [subiendo, setSubiendo] = useState(false);
  const [filtros, setFiltros] = useState({ materia: "", autor: "", año: "" });
  const [buscando, setBuscando] = useState(false);
  const [confirmando, setConfirmando] = useState(null);

  // Cargar libros (básico o filtrado)
  const cargarLibros = async () => {
    setBuscando(false);
    const res = await obtenerLibrosDigitales();
    setLibros(res);
  };

  useEffect(() => {
    cargarLibros();
  }, []);

  // Subida real
  const handleGuardarLibro = async (form) => {
    try {
      setSubiendo(true);
      const urlArchivo = await subirArchivoLibro(form.archivo, `biblioteca/${Date.now()}_${form.archivo.name}`);
      let urlPortada = "";
      if (form.portada) {
        urlPortada = await subirArchivoLibro(form.portada, `biblioteca/portadas/${Date.now()}_${form.portada.name}`);
      }
      console.log(">>> urlArchivo:", urlArchivo, "urlPortada:", urlPortada);
      await publicarLibroDigital({
        titulo: form.titulo,
        autor: form.autor,
        materia: form.materia,
        descripcion: form.descripcion,
        urlArchivo,
        urlPortada,
        urlDrive: form.urlDrive,
        anio: form.anio,
        usuario: user?.email || "", // solo guarda el email si existe user
      });
      setModalOpen(false);
      toast.success("Libro publicado correctamente.");
      cargarLibros();
    } catch (err) {
      toast.error("Error al subir el libro.");
    } finally {
      setSubiendo(false);
    }
  };

  // Edición real
  const handleEditarLibro = async (nuevo) => {
    try {
      setSubiendo(true);
      await editarLibroDigital(libroActual.id, {
        ...libroActual,
        ...nuevo,
      });
      setEditarModal(false);
      setLibroActual(null);
      toast.success("Libro actualizado.");
      cargarLibros();
    } catch (e) {
      toast.error("Error al actualizar libro.");
    } finally {
      setSubiendo(false);
    }
  };

  // Confirmación visual y borrado real
  const handleEliminarLibro = async (libro) => {
    if (!confirmando || confirmando !== libro.id) {
      setConfirmando(libro.id);
      return;
    }
    try {
      await eliminarLibroDigital(libro.id, libro.urlArchivo, libro.urlPortada);
      toast.success("Libro eliminado.");
      cargarLibros();
    } catch (e) {
      toast.error("Error al eliminar libro.");
    }
    setConfirmando(null);
  };

  // Búsqueda avanzada
  const handleFiltroChange = e => {
    const { name, value } = e.target;
    setFiltros(prev => ({ ...prev, [name]: value }));
  };

  const buscarAvanzado = async (ev) => {
    ev.preventDefault();
    setBuscando(true);
    const res = await buscarLibrosAvanzado(filtros);
    setLibros(res);
    setBuscando(false);
  };

  // ---- CONTROL DE ACCESO Y LOADERS ----
  if (checking) {
  return (
    <PageContainer>
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <span className="loader-admin"></span>
        <div className="mt-4 font-bold text-[#7a2518] text-xl">
          Verificando acceso...
        </div>
      </div>
    </PageContainer>
  );
}

if (!user) {
  return (
    <PageContainer>
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="mt-4 font-bold text-[#7a2518] text-lg mb-4">
          Inicia sesión para acceder a la Biblioteca Jurídica.
        </div>
        <button
          className="px-6 py-2 rounded-xl bg-[#7a2518] text-white font-bold"
          onClick={() => window.location.href = "/login"}
        >
          Iniciar sesión
        </button>
        <a
          href="/recuperar"
          className="mt-2 text-[#7a2518] underline text-sm"
        >
          ¿Olvidaste tu contraseña?
        </a>
      </div>
    </PageContainer>
  );
}
  // ---- RENDERIZADO NORMAL (user logueado, acceso OK) ----
  return (
  <PageContainer>
  <Toaster position="top-center" />

  <div className="flex flex-col items-center mb-6 gap-4">
    <h1 className="text-2xl font-bold text-[#7a2518] text-center">
      Biblioteca Jurídica
    </h1>
    <form
      onSubmit={buscarAvanzado}
      className="flex flex-wrap gap-2 items-center justify-center"
    >
      <input
        type="text"
        name="materia"
        placeholder="Materia"
        value={filtros.materia}
        onChange={handleFiltroChange}
        className="rounded px-2 py-1 border border-[#3e2723] text-[#3e2723]"
      />
      <input
        type="text"
        name="autor"
        placeholder="Autor"
        value={filtros.autor}
        onChange={handleFiltroChange}
        className="rounded px-2 py-1 border border-[#3e2723] text-[#3e2723]"
      />
      <input
        type="number"
        name="año"
        placeholder="Año"
        min={1900}
        max={2100}
        value={filtros.año}
        onChange={handleFiltroChange}
        className="rounded px-2 py-1 border border-[#3e2723] text-[#3e2723] w-24"
      />
      <button
        type="submit"
        className="px-3 py-1 rounded bg-[#7a2518] text-white font-semibold"
        disabled={buscando}
      >
        {buscando ? "Buscando..." : "Buscar"}
      </button>
      <button
        type="button"
        className="px-3 py-1 rounded bg-gray-200 text-[#3e2723]"
        onClick={() => {
          setFiltros({ materia: "", autor: "", año: "" });
          cargarLibros();
        }}
      >
        Limpiar
      </button>
    </form>
    {isAdmin && (
      <button
        className="px-4 py-2 rounded-xl bg-[#7a2518] hover:bg-[#3e2723] text-white font-bold self-center"
        onClick={() => setModalOpen(true)}
      >
        Subir Libro
      </button>
    )}
  </div>

  {modalOpen && (
    <SubirLibroModal
      onSave={handleGuardarLibro}
      onClose={() => setModalOpen(false)}
      cargando={subiendo}
    />
  )}

  {editarModal && libroActual && (
    <EditarLibroModal
      libro={libroActual}
      onSave={handleEditarLibro}
      onClose={() => {
        setEditarModal(false);
        setLibroActual(null);
      }}
      cargando={subiendo}
    />
  )}

  {visorLibro && (
    <VisorLibroModal
      libro={visorLibro}
      onClose={() => setVisorLibro(null)}
    />
  )}

  <div className="flex justify-center w-full">
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-2xl">
      {libros.length === 0 && (
        <div className="text-center text-[#3e2723] col-span-full">
          No hay libros registrados.
        </div>
      )}
      {libros.map(libro => (
        <div
          key={libro.id}
          className="rounded-xl border border-[#7a2518] bg-white p-4 shadow flex flex-col"
        >
          {libro.urlPortada && (
            <img
              src={libro.urlPortada}
              alt="portada"
              className="mb-2 h-36 object-cover rounded"
            />
          )}
          <h3 className="text-lg font-bold text-[#7a2518]">
            {libro.titulo}
          </h3>
          <div className="text-[#3e2723] text-sm mb-1">
            {libro.autor}
          </div>
          <div className="text-xs text-[#7a2518] mb-2">
            {libro.materia} {libro.anio && `- ${libro.anio}`}
          </div>
          <div className="text-gray-800 text-sm mb-2">
            {libro.descripcion}
          </div>
          <div className="flex flex-col gap-2 mt-auto">
            <a
              href="#"
              className="px-4 py-1 rounded bg-[#7a2518] text-white text-sm text-center hover:bg-[#3e2723] font-bold"
              onClick={e => {
                e.preventDefault();
                setVisorLibro(libro);
              }}
            >
              Ver Online
            </a>
            {libro.urlDrive && (
              <a
                href={libro.urlDrive}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-1 rounded bg-[#3e2723] text-white text-xs text-center font-bold"
              >
                Ver en Google Drive
              </a>
            )}
          </div>
          {isAdmin && (
            <div className="flex gap-2 mt-3 flex-wrap">
              <button
                className="px-3 py-1 rounded bg-[#3e2723] text-white font-semibold"
                onClick={() => {
                  setLibroActual(libro);
                  setEditarModal(true);
                }}
              >
                Editar
              </button>
              {confirmando === libro.id ? (
                <>
                  <span className="text-red-700 font-semibold text-xs px-2 py-1 rounded">
                    ¿Eliminar? <b>Esta acción no se puede deshacer</b>
                  </span>
                  <button
                    className="px-3 py-1 rounded bg-red-700 text-white font-bold"
                    onClick={() => handleEliminarLibro(libro)}
                  >
                    Confirmar
                  </button>
                  <button
                    className="px-2 py-1 rounded bg-gray-200 text-[#3e2723] font-semibold"
                    onClick={() => setConfirmando(null)}
                  >
                    Cancelar
                  </button>
                </>
              ) : (
                <button
                  className="px-3 py-1 rounded bg-red-700 text-white font-bold"
                  onClick={() => handleEliminarLibro(libro)}
                >
                  Eliminar
                </button>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  </div>
</PageContainer>
);
}
