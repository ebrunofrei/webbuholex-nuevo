import React from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function NoticiasSlidebar({ open, onClose, noticias = [] }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed top-0 right-0 h-full w-full sm:w-[410px] bg-white z-[60] shadow-2xl border-l border-[#b03a1a]"
          initial={{ x: "100%" }}
          animate={{ x: 0 }}
          exit={{ x: "100%" }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          style={{ maxWidth: "100vw" }}
        >
          {/* Cerrar */}
          <button
            className="absolute top-4 right-6 text-2xl text-[#b03a1a] font-black z-70"
            onClick={onClose}
            aria-label="Cerrar noticias"
            style={{ pointerEvents: "auto" }}
          >
            ×
          </button>
          <div className="px-8 py-8 pt-12 overflow-y-auto h-full">
            <h2 className="text-2xl font-bold text-[#b03a1a] mb-6">📰 Últimas noticias</h2>
            {noticias.length === 0 && (
              <p className="text-gray-500 text-sm">No hay noticias disponibles.</p>
            )}
            <ul className="space-y-6">
              {noticias.map((n, i) => (
                <li key={i} className="bg-[#fff4f4] border-l-4 border-[#b03a1a] rounded shadow px-4 py-3">
                  <h3 className="font-bold text-[#b03a1a] text-lg">{n.titulo}</h3>
                  <p className="text-gray-700 text-base">{n.resumen}</p>
                </li>
              ))}
            </ul>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
