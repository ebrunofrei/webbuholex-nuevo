// src/components/BuhoAnimado.jsx
import React, { useEffect, useRef } from "react";

export default function BuhoAnimado({ width = 200 }) {
  const ojoIzq = useRef();
  const ojoDer = useRef();

  useEffect(() => {
    // Animación de guiño (cierra un ojo)
    setTimeout(() => {
      if (ojoIzq.current) ojoIzq.current.setAttribute("ry", 4); // Cierra ojo izq
      if (ojoDer.current) ojoDer.current.setAttribute("ry", 14); // Mantiene ojo der abierto
    }, 1200);

    setTimeout(() => {
      if (ojoIzq.current) ojoIzq.current.setAttribute("ry", 14); // Abre ojo izq
    }, 1800);
  }, []);

  // SVG del búho con ojos editables
  return (
    <svg width={width} viewBox="0 0 220 260" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ userSelect: "none", pointerEvents: "none" }}>
      <ellipse cx="70" cy="80" rx="38" ry="40" fill="#F8E3B0" />
      <ellipse cx="150" cy="80" rx="38" ry="40" fill="#F8E3B0" />
      {/* Cuerpo */}
      <ellipse cx="110" cy="170" rx="74" ry="80" fill="#DFC086" />
      {/* Ojos */}
      <ellipse ref={ojoIzq} cx="75" cy="88" rx="14" ry="14" fill="#fff" />
      <ellipse ref={ojoDer} cx="146" cy="88" rx="14" ry="14" fill="#fff" />
      <ellipse cx="75" cy="88" rx="6" ry="6" fill="#543916" />
      <ellipse cx="146" cy="88" rx="6" ry="6" fill="#543916" />
      {/* Pico */}
      <polygon points="110,104 104,115 116,115" fill="#dcb268" />
      {/* Toga y libro */}
      <rect x="66" y="134" width="88" height="46" rx="18" fill="#1c2830" />
      <rect x="148" y="142" width="24" height="36" rx="4" fill="#C89238" />
      {/* Balanza */}
      <g>
        <line x1="40" y1="120" x2="90" y2="122" stroke="#B8861A" strokeWidth="4" />
        <ellipse cx="38" cy="132" rx="8" ry="6" fill="#F8E3B0" stroke="#B8861A" strokeWidth="3" />
        <line x1="38" y1="132" x2="38" y2="120" stroke="#B8861A" strokeWidth="2" />
      </g>
      {/* Manos */}
      <ellipse cx="60" cy="172" rx="10" ry="8" fill="#F6C86C" />
      <ellipse cx="158" cy="172" rx="10" ry="8" fill="#F6C86C" />
      {/* Base */}
      <rect x="65" y="210" width="90" height="26" rx="10" fill="#F9F3E2" />
      <text x="110" y="228" fontSize="23" fontWeight="bold" fill="#9b8552" textAnchor="middle" fontFamily="Georgia,serif">
        BÚHOLEX
      </text>
    </svg>
  );
}
