// src/components/ui/Lightbox.jsx
import React, { useEffect, useRef, useState } from "react";

export default function Lightbox({ images = [], start = 0, onClose }) {
  const [i, setI] = useState(start);
  const startX = useRef(null);

  const hasPrev = i > 0;
  const hasNext = i < images.length - 1;

  const goPrev = () => hasPrev && setI(i - 1);
  const goNext = () => hasNext && setI(i + 1);

  useEffect(() => {
    // Bloquear scroll del body mientras está abierto
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "ArrowRight") goNext();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i]);

  // Swipe básico para móvil
  const onTouchStart = (e) => (startX.current = e.touches[0].clientX);
  const onTouchEnd = (e) => {
    if (startX.current == null) return;
    const delta = e.changedTouches[0].clientX - startX.current;
    if (Math.abs(delta) > 40) {
      if (delta > 0) goPrev();
      else goNext();
    }
    startX.current = null;
  };

  if (!images.length) return null;

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center"
      onClick={(e) => {
        // Cerrar solo si se clickea fuera del contenido
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      {/* Botón cerrar */}
      <button
        onClick={onClose}
        aria-label="Cerrar"
        className="absolute top-4 right-4 rounded-full bg-white/90 hover:bg-white p-2 shadow"
      >
        ✕
      </button>

      {/* Flechas */}
      <button
        onClick={(e) => { e.stopPropagation(); goPrev(); }}
        disabled={!hasPrev}
        className="hidden sm:flex absolute left-4 top-1/2 -translate-y-1/2 items-center justify-center w-10 h-10 rounded-full bg-white/90 hover:bg-white shadow disabled:opacity-40"
        aria-label="Anterior"
      >‹</button>

      <button
        onClick={(e) => { e.stopPropagation(); goNext(); }}
        disabled={!hasNext}
        className="hidden sm:flex absolute right-4 top-1/2 -translate-y-1/2 items-center justify-center w-10 h-10 rounded-full bg-white/90 hover:bg-white shadow disabled:opacity-40"
        aria-label="Siguiente"
      >›</button>

      {/* Imagen */}
      <div
        className="max-w-[95vw] max-h-[90vh] select-none"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <img
          src={images[i]}
          alt={`preview-${i}`}
          draggable={false}
          className="max-w-[95vw] max-h-[90vh] object-contain rounded-lg shadow"
          onError={(e) => (e.currentTarget.style.display = "none")}
        />
      </div>
    </div>
  );
}
