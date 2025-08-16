import React, { useEffect } from "react";
import useCulqi from "../hooks/useCulqi";

const CULQI_PUBLIC_KEY = "pk_test_9B6trm3NNnm0kBu0"; // Cambia por tu llave real en prod

export default function ProCardCulqi() {
  // Configuración de Culqi Checkout
  useCulqi(CULQI_PUBLIC_KEY, {
    title: "BúhoLex PRO",
    currency: "PEN",
    description: "Suscripción mensual BúhoLex PRO",
    amount: 4900, // S/49.00 en céntimos
  });

  useEffect(() => {
    window.culqi = function () {
      if (window.Culqi.token) {
        // Aquí tienes el token del cliente (pago exitoso)
        // Normalmente deberías enviar esto a tu backend para procesar el cobro real
        alert("¡Pago exitoso! Token: " + window.Culqi.token.id);
        // Aquí puedes hacer fetch/post a tu backend, activar PRO, etc.
      } else if (window.Culqi.order) {
        // Si usas Culqi Orders, puedes validar aquí el order_id
      } else {
        // El user cerró el modal o hubo error
        // alert("No se realizó el pago");
      }
    };
  }, []);

  const openCulqiCheckout = () => {
    if (window.Culqi) {
      window.Culqi.open();
    } else {
      alert("Culqi no está cargado aún. Intenta de nuevo.");
    }
  };

  return (
    <div className="max-w-md mx-auto my-8 p-8 bg-white rounded-2xl shadow-2xl border-2 border-yellow-400 flex flex-col items-center">
      <h2 className="text-2xl font-bold text-yellow-700 mb-4">BúhoLex PRO</h2>
      <ul className="text-left mb-6 text-lg">
        <li>✅ Oficina virtual personalizada</li>
        <li>✅ LitisBot multidominio y multidioma</li>
        <li>✅ Gestión inteligente de expedientes</li>
        <li>✅ Asistente legal en tiempo real</li>
        <li>✅ Personalización avanzada para litigios</li>
      </ul>
      <button
        className="bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-3 px-8 rounded-2xl text-lg shadow-lg transition mb-3"
        onClick={openCulqiCheckout}
      >
        Suscribirme a PRO con Culqi
      </button>
      <div className="flex items-center gap-2 mt-2">
        <img src="/visa.png" alt="Visa" className="w-8" />
        <img src="/mastercard.png" alt="MasterCard" className="w-8" />
        <img src="/amex.png" alt="Amex" className="w-8" />
      </div>
      <span className="block mt-2 text-sm text-gray-500">
        🔒 Pago seguro con Culqi & SSL
      </span>
    </div>
  );
}
