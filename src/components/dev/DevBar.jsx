import React from "react";

/**
 * Barra de depuración simple y reusable.
 * - Muestra contadores clave y botones de prueba.
 * - No interfiere con la UI: se pega al borde inferior.
 */
export default function DevBar({
  visible = false,
  itemsCount = 0,
  page = 1,
  hasMore = false,
  loading = false,
  onLogSample,
  onForceNext,
  onClear,
  title = "DEV",
}) {
  if (!visible) return null;
  return (
    <div className="fixed left-2 right-2 bottom-2 z-[9999]">
      <div className="mx-auto max-w-[1100px] rounded-lg border bg-white shadow p-2 text-sm flex flex-wrap items-center gap-2">
        <span className="px-2 py-1 rounded bg-gray-100 font-semibold">{title}</span>
        <span>items: <b>{itemsCount}</b></span>
        <span>page: <b>{page}</b></span>
        <span>hasMore: <b>{String(hasMore)}</b></span>
        <span>loading: <b className={loading ? "text-red-600" : "text-emerald-700"}>
          {String(loading)}
        </b></span>
        <div className="ml-auto flex gap-2">
          <button
            onClick={onLogSample}
            className="px-2 py-1 rounded border hover:bg-gray-50"
            title="console.table primeros 5"
          >
            Log sample
          </button>
          <button
            onClick={onForceNext}
            className="px-2 py-1 rounded border hover:bg-gray-50"
            title="Forzar Cargar más"
          >
            Next
          </button>
          <button
            onClick={onClear}
            className="px-2 py-1 rounded border hover:bg-gray-50"
            title="Vaciar lista"
          >
            Clear
          </button>
        </div>
      </div>
    </div>
  );
}
