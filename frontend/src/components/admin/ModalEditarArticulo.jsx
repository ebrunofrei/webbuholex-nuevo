import React, { useState, useEffect } from "react";

const ESTADOS = [
  { value: "vigente", label: "Vigente" },
  { value: "derogado", label: "Derogado" },
  { value: "vacatio legis", label: "Vacatio Legis" },
  { value: "pendiente", label: "Pendiente" },
];

export default function ModalEditarArticulo({
  articulo,
  onClose,
  onSave,
  onDelete,
  isAdmin = false,
}) {
  const [form, setForm] = useState({
    titulo: "",
    texto: "",
    estadoVigencia: "",
    fecha_actualizacion: "",
  });
  const [errores, setErrores] = useState({});
  const [cargando, setCargando] = useState(false);
  const [cargandoDelete, setCargandoDelete] = useState(false);
  const [confirmando, setConfirmando] = useState(false);

  useEffect(() => {
    if (articulo) {
      setForm({
        titulo: articulo.titulo || "",
        texto: articulo.texto || "",
        estadoVigencia: articulo.estadoVigencia || "vigente",
        fecha_actualizacion: articulo.fecha_actualizacion
          ? articulo.fecha_actualizacion.substring(0, 10)
          : new Date().toISOString().substring(0, 10),
      });
      setErrores({});
      setConfirmando(false);
    }
  }, [articulo]);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function validar() {
    let errs = {};
    if (!form.titulo.trim()) errs.titulo = "El título es obligatorio";
    if (!form.texto.trim() || form.texto.length < 10)
      errs.texto = "El texto es obligatorio y debe ser más largo";
    if (!form.estadoVigencia) errs.estadoVigencia = "Selecciona el estado";
    if (!form.fecha_actualizacion) errs.fecha_actualizacion = "Selecciona una fecha";
    setErrores(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleGuardar(e) {
    e.preventDefault();
    if (!validar()) return;
    setCargando(true);
    try {
      await onSave({
        ...articulo,
        ...form,
        fecha_actualizacion: form.fecha_actualizacion,
      });
      onClose();
    } catch (err) {
      setErrores({ general: "Error al guardar. Intenta de nuevo." });
      setCargando(false);
    }
  }

  async function handleEliminar() {
    if (!confirmando) {
      setConfirmando(true);
      return;
    }
    setCargandoDelete(true);
    try {
      await onDelete(articulo);
      onClose();
    } catch (err) {
      setErrores({ general: "Error al eliminar. Intenta de nuevo." });
      setCargandoDelete(false);
    }
  }

  if (!articulo) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-30 flex items-center justify-center">
      <div className="bg-white rounded-2xl p-6 shadow-xl w-full max-w-lg relative border-2 border-[#7a2518]">
        <button
          className="absolute top-3 right-3 text-gray-400 hover:text-red-600 text-2xl"
          onClick={onClose}
          disabled={cargando || cargandoDelete}
        >
          &times;
        </button>
        <h2 className="text-xl font-bold text-[#7a2518] mb-4">
          Editar Artículo
        </h2>
        <form onSubmit={handleGuardar} className="flex flex-col gap-3">
          <div>
            <label className="block font-semibold text-[#3e2723] mb-1">Título</label>
            <input
              type="text"
              name="titulo"
              value={form.titulo}
              onChange={handleChange}
              className={`w-full p-2 rounded border ${
                errores.titulo ? "border-red-500" : "border-[#7a2518]"
              }`}
              autoFocus
            />
            {errores.titulo && (
              <span className="text-red-500 text-xs">{errores.titulo}</span>
            )}
          </div>
          <div>
            <label className="block font-semibold text-[#3e2723] mb-1">Texto</label>
            <textarea
              name="texto"
              value={form.texto}
              onChange={handleChange}
              rows={6}
              className={`w-full p-2 rounded border ${
                errores.texto ? "border-red-500" : "border-[#7a2518]"
              }`}
            />
            {errores.texto && (
              <span className="text-red-500 text-xs">{errores.texto}</span>
            )}
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block font-semibold text-[#3e2723] mb-1">
                Estado de Vigencia
              </label>
              <select
                name="estadoVigencia"
                value={form.estadoVigencia}
                onChange={handleChange}
                className={`w-full p-2 rounded border ${
                  errores.estadoVigencia ? "border-red-500" : "border-[#7a2518]"
                }`}
              >
                {ESTADOS.map((op) => (
                  <option value={op.value} key={op.value}>
                    {op.label}
                  </option>
                ))}
              </select>
              {errores.estadoVigencia && (
                <span className="text-red-500 text-xs">{errores.estadoVigencia}</span>
              )}
            </div>
            <div className="flex-1">
              <label className="block font-semibold text-[#3e2723] mb-1">
                Fecha actualización
              </label>
              <input
                type="date"
                name="fecha_actualizacion"
                value={form.fecha_actualizacion}
                onChange={handleChange}
                className={`w-full p-2 rounded border ${
                  errores.fecha_actualizacion ? "border-red-500" : "border-[#7a2518]"
                }`}
              />
              {errores.fecha_actualizacion && (
                <span className="text-red-500 text-xs">{errores.fecha_actualizacion}</span>
              )}
            </div>
          </div>
          {errores.general && (
            <div className="text-center text-red-600 mt-1">{errores.general}</div>
          )}

          {/* Confirmación personalizada */}
          {confirmando && (
            <div className="text-center text-red-700 font-semibold mb-2">
              ¿Estás seguro que deseas eliminar este artículo?
              <br />
              Esta acción <b>no se puede deshacer</b>.
            </div>
          )}

          <div className="flex justify-between mt-4 gap-2">
            <button
              type="button"
              className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold"
              onClick={onClose}
              disabled={cargando || cargandoDelete}
            >
              Cancelar
            </button>
            <div className="flex gap-2">
              {isAdmin && (
                confirmando ? (
                  <>
                    <button
                      type="button"
                      className="px-4 py-2 rounded bg-gray-200 text-[#3e2723] font-semibold"
                      onClick={() => setConfirmando(false)}
                      disabled={cargandoDelete}
                    >
                      No eliminar
                    </button>
                    <button
                      type="button"
                      className="px-4 py-2 rounded bg-red-600 hover:bg-red-700 text-white font-bold"
                      onClick={handleEliminar}
                      disabled={cargandoDelete}
                    >
                      {cargandoDelete ? "Eliminando..." : "Confirmar Eliminación"}
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    className="px-4 py-2 rounded bg-red-600 hover:bg-red-700 text-white font-bold"
                    onClick={handleEliminar}
                    disabled={cargandoDelete}
                  >
                    {cargandoDelete ? "Eliminando..." : "Eliminar"}
                  </button>
                )
              )}
              <button
                type="submit"
                className="px-4 py-2 rounded bg-[#7a2518] hover:bg-[#3e2723] text-white font-bold"
                disabled={cargando || cargandoDelete}
              >
                {cargando ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
