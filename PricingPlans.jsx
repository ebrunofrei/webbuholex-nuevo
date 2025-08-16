// src/components/PricingPlans.jsx

import React from "react";

const PLANES = [
  {
    nombre: "FREE",
    color: "bg-gray-100",
    precio: "S/ 0",
    descripcion: "Ideal para quienes inician en BúhoLex.",
    beneficios: [
      "Chat básico",
      "Biblioteca libre",
      "Consultas legales abiertas"
    ],
    esGratis: true
  },
  {
    nombre: "Estudiantes",
    color: "bg-blue-50",
    precio: "S/ 12",
    descripcion: "Formación y recursos premium.",
    beneficios: [
      "Foros legales exclusivos",
      "Plantillas y modelos",
      "Biblioteca académica",
      "Certificado de participación"
    ],
    culqi: { key: 'pk_test_xxxxxxx', plan: "Estudiantes", amount: 1200 }
  },
  {
    nombre: "Empresas",
    color: "bg-yellow-50",
    precio: "S/ 59",
    descripcion: "Legaltech para organizaciones.",
    beneficios: [
      "Chat legal para colaboradores",
      "Biblioteca privada",
      "Reportes y compliance",
      "LitisBot para empresa"
    ],
    culqi: { key: 'pk_test_xxxxxxx', plan: "Empresas", amount: 5900 }
  },
  {
    nombre: "Abogados PRO",
    color: "bg-green-50",
    precio: "S/ 29",
    descripcion: "Potencia y automatización.",
    beneficios: [
      "Oficina Virtual Inteligente",
      "Gestión de expedientes y clientes",
      "LitisBot multidioma avanzado",
      "Personalización de litigio en tiempo real",
      "Alertas por WhatsApp y email"
    ],
    culqi: { key: 'pk_test_xxxxxxx', plan: "Pro Abogado", amount: 2900 }
  }
];

export default function PricingPlans() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-red-100 to-yellow-50 py-12 flex flex-col items-center">
      <h2 className="text-4xl font-bold mb-10 text-center">Elige tu plan <span className="text-yellow-600">BúhoLex</span></h2>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 w-full max-w-6xl mb-10">
        {PLANES.map((plan, idx) => (
          <div
            key={plan.nombre}
            className={`rounded-2xl shadow-lg p-7 flex flex-col items-center relative border ${plan.color} ${plan.nombre === "Abogados PRO" ? "border-2 border-green-500" : ""}`}
          >
            {plan.nombre === "Abogados PRO" && (
              <div className="absolute top-0 right-0 px-3 py-1 bg-green-200 rounded-bl-2xl text-xs font-bold">¡RECOMENDADO!</div>
            )}
            <h3 className={`text-2xl font-bold mb-2 ${plan.nombre === "Abogados PRO" ? "text-green-700" : plan.nombre === "Empresas" ? "text-yellow-700" : plan.nombre === "Estudiantes" ? "text-blue-700" : "text-gray-600"}`}>{plan.nombre}</h3>
            <span className="text-lg font-bold mb-2 text-gray-700">{plan.precio}</span>
            <p className="mb-3 text-gray-500 text-center">{plan.descripcion}</p>
            <ul className="mb-6 text-gray-700 text-left space-y-1">
              {plan.beneficios.map((b, i) => (
                <li key={i}>✓ {b}</li>
              ))}
            </ul>
            {plan.esGratis ? (
              <button className="bg-gray-300 text-gray-700 rounded px-5 py-2 font-bold cursor-default w-full">Ya incluido</button>
            ) : (
              <>
                <button
                  onClick={() => abrirCulqi(plan.culqi.key, plan.culqi.plan, plan.culqi.amount)}
                  className={`w-full mb-3 rounded px-5 py-2 font-bold text-white ${plan.nombre === "Abogados PRO"
                    ? "bg-green-600 hover:bg-green-700"
                    : plan.nombre === "Empresas"
                    ? "bg-yellow-500 hover:bg-yellow-600"
                    : "bg-blue-600 hover:bg-blue-700"
                  }`}
                >
                  Pagar con Culqi
                </button>
                {/* Sección QR SOLO para planes pagados */}
                <div className="text-xs text-gray-600 mb-1">o paga con QR bancario</div>
                <img src="/img/qr-bbva.jpg" alt="Pago QR BBVA" className="w-24 h-24 mx-auto rounded-xl border mb-2" />
                <a href="/subir-comprobante" className="text-blue-600 underline text-xs">Subir comprobante</a>
              </>
            )}
          </div>
        ))}
      </div>
      <div className="w-full max-w-lg mt-6 flex flex-col items-center">
        <div className="bg-white rounded-xl shadow p-5 flex flex-col items-center">
          <h4 className="text-lg font-bold mb-2">¿Pagaste con QR?</h4>
          <p className="text-gray-700 mb-2 text-center">
            Sube tu comprobante <a href="/subir-comprobante" className="text-blue-600 underline">aquí</a> o escríbenos a <a href="https://wa.me/51922038280" className="text-green-600 underline font-semibold" target="_blank">WhatsApp</a> para activar tu plan.
          </p>
        </div>
      </div>
      <script src="https://checkout.culqi.com/js/v4"></script>
    </div>
  );
}

// Script para inicializar Culqi (puedes ponerlo en _app.js o en un useEffect global)
function abrirCulqi(publicKey, plan, amount) {
  if (!window.Culqi) {
    alert("Culqi no cargó. Refresca la página.");
    return;
  }
  window.Culqi.publicKey = publicKey;
  window.Culqi.settings({
    title: 'BúhoLex - ' + plan,
    currency: 'PEN',
    description: plan,
    amount,
  });
  window.Culqi.open();
}
