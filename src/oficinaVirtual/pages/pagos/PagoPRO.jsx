// src/oficinaVirtual/pages/pagos/PagoPRO.jsx

import React from "react";

export default function PagoPRO() {
  return (
    <div className="flex flex-col justify-center items-center min-h-[60vh]">
      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-6 rounded-xl shadow-md max-w-md text-center">
        <h2 className="text-xl font-bold mb-2 text-yellow-700">Acceso exclusivo a funciones avanzadas</h2>
        <p className="mb-4 text-gray-700">
          Para utilizar todas las herramientas premium y acceder a funciones profesionales de BúhoLex, realiza tu suscripción. El acceso es inmediato tras el pago.
        </p>
        <button
          className="bg-yellow-700 hover:bg-yellow-800 text-white px-6 py-2 rounded-lg font-semibold transition"
          onClick={() => window.location.href="/checkout"}
        >
          Pagar suscripción PRO
        </button>
        <div className="text-xs text-gray-500 mt-4">
          ¿Ya pagaste? <a href="/oficinaVirtual" className="text-blue-600 underline">Ir a la Oficina Virtual</a>
        </div>
      </div>
    </div>
  );
}
