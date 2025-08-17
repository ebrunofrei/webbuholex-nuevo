import React, { useState } from "react";

export default function WhatsAppAlertButton({ celular, mensaje }) {
  const [loading, setLoading] = useState(false);

  const handleEnviar = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/send-whatsapp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: celular, // formato: +51922038280
          body: mensaje,
        }),
      });
      if (res.ok) {
        alert("¡Mensaje enviado por WhatsApp!");
      } else {
        const data = await res.json();
        alert("Error: " + data.error);
      }
    } catch {
      alert("Ocurrió un error.");
    }
    setLoading(false);
  };

  return (
    <button
      className="rounded-xl bg-green-600 p-2 text-white w-full"
      onClick={handleEnviar}
      disabled={loading}
      style={{ fontSize: 18, margin: 8 }}
    >
      {loading ? "Enviando..." : "Enviar alerta por WhatsApp"}
    </button>
  );
}
