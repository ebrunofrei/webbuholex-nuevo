import React, { useRef } from "react";
import html2canvas from "html2canvas";

// Puedes ajustar el ancho/alto según DPI deseado. (340x212px = 8.6x5.4cm aprox. a 100dpi)
const CARD_WIDTH = 340;
const CARD_HEIGHT = 212;

export default function TarjetaPresentacion({
  logo,
  nombre = "Eduardo Frei Bruno Gómez",
  titulo = "Abogado - Magister",
  especialidad = "Consultoría en Gestión Pública, Privada y Defensa Judicial",
  celular = "951852250",
  email = "eduperu2003@hotmail.com",
  eslogan = "Soluciones legales con experiencia y ética profesional",
  colorPrincipal = "#bdaa71", // dorado elegante
  fondo = "#f9f7f2"
}) {
  const cardRef = useRef();

  // Descargar tarjeta como imagen
  const descargarTarjeta = async () => {
    if (!cardRef.current) return;
    const canvas = await html2canvas(cardRef.current, { backgroundColor: null, useCORS: true });
    const url = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.href = url;
    link.download = `Tarjeta_${nombre.replace(/\s/g, "_")}.png`;
    link.click();
  };

  return (
    <div className="flex flex-col items-center">
      {/* Tarjeta visual */}
      <div
        ref={cardRef}
        className="relative shadow-xl border rounded-2xl overflow-hidden"
        style={{
          width: CARD_WIDTH,
          height: CARD_HEIGHT,
          background: `linear-gradient(120deg, ${fondo}, #f5e7c6 70%)`,
          borderColor: colorPrincipal
        }}
      >
        {/* Sello / Estrella */}
        <span
          style={{
            position: "absolute",
            left: 10,
            top: 10,
            fontSize: 32,
            color: colorPrincipal,
            fontWeight: 900
          }}
        >
          ★
        </span>
        {/* Logo circular */}
        <img
          src={logo || "/logo192.png"}
          alt="Logo"
          style={{
            position: "absolute",
            top: 20,
            right: 18,
            width: 56,
            height: 56,
            borderRadius: "50%",
            border: `2px solid ${colorPrincipal}`,
            background: "#fff",
            objectFit: "cover"
          }}
        />
        {/* Nombre */}
        <div
          style={{
            position: "absolute",
            top: 80,
            left: 0,
            width: "100%",
            textAlign: "center",
            fontFamily: "'Lora', serif",
            color: "#453516",
            fontWeight: 700,
            fontSize: 21,
            letterSpacing: 1
          }}
        >
          {nombre}
        </div>
        {/* Título */}
        <div
          style={{
            position: "absolute",
            top: 108,
            width: "100%",
            textAlign: "center",
            fontFamily: "Lato, Arial",
            color: "#8a7147",
            fontWeight: 500,
            fontSize: 15
          }}
        >
          {titulo}
        </div>
        {/* Especialidad */}
        <div
          style={{
            position: "absolute",
            top: 130,
            width: "100%",
            textAlign: "center",
            color: "#927b59",
            fontSize: 13
          }}
        >
          {especialidad}
        </div>
        {/* Frase/Eslogan */}
        <div
          style={{
            position: "absolute",
            top: 152,
            left: 18,
            right: 18,
            textAlign: "center",
            color: colorPrincipal,
            fontSize: 12,
            fontStyle: "italic",
            fontWeight: 500
          }}
        >
          {eslogan}
        </div>
        {/* Línea divisoria */}
        <div
          style={{
            position: "absolute",
            bottom: 44,
            left: 18,
            width: "calc(100% - 36px)",
            height: 1.5,
            background: `linear-gradient(90deg, #e7d4b0, ${colorPrincipal}, #e7d4b0)`
          }}
        />
        {/* Contacto */}
        <div
          style={{
            position: "absolute",
            bottom: 18,
            left: 22,
            fontSize: 13,
            color: "#795b2c",
            textAlign: "left",
            fontFamily: "Lato, Arial"
          }}
        >
          <div>
            <span style={{ fontWeight: 600 }}>Cel.:</span> {celular}
          </div>
          <div>
            <span style={{ fontWeight: 600 }}>Email:</span> {email}
          </div>
        </div>
      </div>

      {/* Botón de descarga */}
      <button
        onClick={descargarTarjeta}
        className="mt-3 bg-[#bdaa71] hover:bg-[#98813e] text-white font-bold px-5 py-2 rounded-lg shadow"
      >
        Descargar como imagen
      </button>
      <div className="text-xs text-gray-400 mt-1">Tamaño billetera 8.6 x 5.4 cm (340x212px)</div>
    </div>
  );
}
