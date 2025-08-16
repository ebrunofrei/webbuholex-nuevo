import React, { useState, useRef, useEffect } from "react";
// IMPORTA TU COMPONENTE UNIFICADO:
import litisbotLogo from "@/assets/litisbot-logo.png";
import { X } from "lucide-react";

// --- Este componente solo gestiona la posición, apertura/cierre y drag & drop ---
export default function LitisBotBubbleChat({ usuarioId }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState(
    () => JSON.parse(localStorage.getItem("litisbot-pos")) || { x: window.innerWidth - 90, y: window.innerHeight - 120 }
  );
  const [drag, setDrag] = useState(false);
  const offset = useRef({ x: 0, y: 0 });

  // --- Drag & Drop nativo ---
  const handleMouseDown = (e) => {
    setDrag(true);
    offset.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };
    document.body.style.userSelect = "none";
  };
  const handleTouchStart = (e) => {
    setDrag(true);
    offset.current = { x: e.touches[0].clientX - pos.x, y: e.touches[0].clientY - pos.y };
    document.body.style.userSelect = "none";
  };
  useEffect(() => {
    if (!drag) return;
    const move = (e) => {
      let x = (e.touches ? e.touches[0].clientX : e.clientX) - offset.current.x;
      let y = (e.touches ? e.touches[0].clientY : e.clientY) - offset.current.y;
      x = Math.max(10, Math.min(x, window.innerWidth - 80));
      y = Math.max(10, Math.min(y, window.innerHeight - (open ? 450 : 80)));
      setPos({ x, y });
    };
    const up = () => {
      setDrag(false);
      localStorage.setItem("litisbot-pos", JSON.stringify(pos));
      document.body.style.userSelect = "";
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    window.addEventListener("touchmove", move);
    window.addEventListener("touchend", up);
    return () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
      window.removeEventListener("touchmove", move);
      window.removeEventListener("touchend", up);
    };
  }, [drag, open, pos]);

  useEffect(() => {
    const fix = () => setPos((prev) => ({
      x: Math.min(prev.x, window.innerWidth - 80),
      y: Math.min(prev.y, window.innerHeight - (open ? 450 : 80)),
    }));
    window.addEventListener("resize", fix);
    return () => window.removeEventListener("resize", fix);
  }, [open]);

  // --- Renderiza la burbuja y el chat modal flotante ---
  return (
    <>
      {/* Bubble flotante drag & drop */}
      {!open && (
        <div
          className="fixed z-[9999] cursor-move select-none flex items-center justify-center"
          style={{
            left: pos.x, top: pos.y, width: 64, height: 64, borderRadius: 32,
            background: "#6d4a28", boxShadow: "0 8px 32px #0002", border: "4px solid #fff",
            userSelect: "none"
          }}
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
          title="Arrastra para mover"
        >
          <button
            className="w-12 h-12 rounded-full bg-[#6d4a28] flex items-center justify-center"
            style={{ border: "none" }}
            onClick={() => setOpen(true)}
            tabIndex={-1}
          >
            <img src={litisbotLogo} alt="LitisBot" className="w-9 h-9" />
          </button>
        </div>
      )}
      {/* Chat modal profesional, DRY, responsive */}
      {open && (
        <div
          className="fixed z-[10000] bg-white rounded-2xl shadow-xl border border-[#6d4a28] flex flex-col"
          style={{
            left: pos.x, top: pos.y,
            width: 340, maxWidth: "98vw", height: 450, minHeight: 340, borderRadius: 24, userSelect: "none"
          }}
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
          tabIndex={-1}
        >
          {/* Cabecera minimalista */}
          <div className="flex items-center justify-between px-4 py-2 bg-[#6d4a28] text-white rounded-t-2xl cursor-move">
            <div className="flex items-center gap-2">
              <img src={litisbotLogo} alt="LitisBot" className="w-7 h-7" />
              <span className="font-bold">LitisBot</span>
            </div>
            <button onClick={() => setOpen(false)} className="text-white hover:text-[#ecd5b0] p-1">
              <X size={20} />
            </button>
          </div>
          {/* Aquí usas tu chat unificado (con toda la lógica) */}
        </div>
      )}
    </>
  );
}
