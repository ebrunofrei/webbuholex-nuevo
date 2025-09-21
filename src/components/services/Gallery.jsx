// src/components/services/Gallery.jsx
import React, { useState } from "react";
import Lightbox from "@/components/ui/Lightbox";

export default function Gallery({ images = [], enablePreview = true }) {
  const [open, setOpen] = useState(false);
  const [start, setStart] = useState(0);

  if (!images.length) return null;

  return (
    <>
      <div className="overflow-x-auto flex gap-3 snap-x snap-mandatory pb-2">
        {images.map((src, i) => (
          <button
            key={i}
            type="button"
            className="relative snap-start group"
            onClick={() => {
              if (!enablePreview) return;
              setStart(i);
              setOpen(true);
            }}
            aria-label="Ampliar imagen"
          >
            <img
              src={src}
              alt={`gal-${i}`}
              loading="lazy"
              decoding="async"
              onError={(e) => (e.currentTarget.style.display = "none")}
              className="h-40 w-auto rounded-xl object-cover border transition group-hover:opacity-90"
            />
            {enablePreview && (
              <span className="absolute bottom-2 right-2 text-xs bg-black/60 text-white px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition">
                Ver
              </span>
            )}
          </button>
        ))}
      </div>

      {enablePreview && open && (
        <Lightbox
          images={images}
          start={start}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
