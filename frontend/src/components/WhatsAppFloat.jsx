import React from "react";
import { FaWhatsapp } from "react-icons/fa6";

export default function WhatsAppFloat() {
  // Número principal (cámbialo si deseas)
  const numeroNormal = "51922038280"; // SIN "+" NI ESPACIOS
  const numeroBusiness = "51922038280"; // Puedes cambiar si tienes otro para Business
  const mensaje = encodeURIComponent("¡Hola! Solicito información sobre los servicios de BúhoLex.");

  // Detectar móvil (UserAgent simple)
  const isMobile = /Android|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i.test(navigator.userAgent);

  // URL para WhatsApp normal
  const urlNormal = isMobile
    ? `https://api.whatsapp.com/send?phone=${numeroNormal}&text=${mensaje}`
    : `https://web.whatsapp.com/send?phone=${numeroNormal}&text=${mensaje}`;

  // URL para WhatsApp Business
  const urlBusiness = isMobile
    ? `https://api.whatsapp.com/send?phone=${numeroBusiness}&text=${mensaje}`
    : `https://web.whatsapp.com/send?phone=${numeroBusiness}&text=${mensaje}`;

  return (
    <div style={{
      position: "fixed",
      bottom: 26,
      right: 24,
      zIndex: 999,
      display: "flex",
      flexDirection: "column",
      gap: 13
    }}>
      {/* Botón WhatsApp Normal */}
      <a
        href={urlNormal}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Chatea con nosotros en WhatsApp"
        style={{
          background: "#25d366",
          color: "#fff",
          borderRadius: "50%",
          width: 56,
          height: 56,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 4px 16px #25d36655",
          fontSize: 34,
          transition: "box-shadow 0.2s, transform 0.2s",
          border: "3px solid #fff"
        }}
        title="Chatea por WhatsApp"
      >
        <FaWhatsapp />
      </a>
      {/* Botón WhatsApp Business */}
      <a
        href={urlBusiness}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Chatea con nosotros en WhatsApp Business"
        style={{
          background: "#128C7E",
          color: "#fff",
          borderRadius: "50%",
          width: 56,
          height: 56,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 4px 16px #128C7E66",
          fontSize: 34,
          transition: "box-shadow 0.2s, transform 0.2s",
          border: "3px solid #fff"
        }}
        title="Chatea por WhatsApp Business"
      >
        <FaWhatsapp />
      </a>
    </div>
  );
}
