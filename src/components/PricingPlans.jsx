import { useState } from "react";

// Usa tu endpoint real para el backend de pagos
const PUBLIC_KEY_CULQI = 'pk_test_xxxxxxx';

export default function PricingPlans() {
  const [showQR, setShowQR] = useState(false);

  // Puedes usar useEffect para cargar Culqi script si es necesario
  const handlePagar = (plan, amount) => {
    if (window.Culqi) {
      window.Culqi.publicKey = PUBLIC_KEY_CULQI;
      window.Culqi.settings({
        title: 'BúhoLex - ' + plan,
        currency: 'PEN',
        description: plan,
        amount: amount,
      });
      window.Culqi.open();
    } else {
      alert('Culqi aún no se ha cargado.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-100 to-yellow-50 py-12 flex flex-col items-center">
      <h2 className="text-4xl font-bold mb-10">Elige tu plan BúhoLex</h2>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8 w-full max-w-6xl">
        {/* FREE */}
        <PlanCard title="Free" price="0" color="red" features={[
          "Chat básico",
          "Biblioteca libre",
          "Consultas legales abiertas"
        ]} btn={<button className="bg-gray-300 text-gray-700 rounded px-5 py-2 font-bold cursor-default">Ya incluido</button>} />

        {/* ESTUDIANTES */}
        <PlanCard title="Estudiantes" price="12" color="blue" features={[
          "Acceso a foros legales",
          "Plantillas y modelos",
          "Biblioteca académica",
          "Certificado de participación"
        ]} btn={
          <button onClick={() => handlePagar("Estudiantes", 1200)} className="bg-blue-600 hover:bg-blue-700 text-white rounded px-5 py-2 font-bold">Pagar con Culqi</button>
        } />

        {/* EMPRESAS */}
        <PlanCard title="Empresas" price="59" color="yellow" features={[
          "Chat legal para colaboradores",
          "Biblioteca privada",
          "Reportes y compliance",
          "LitisBot empresa"
        ]} btn={
          <button onClick={() => handlePagar("Empresas", 5900)} className="bg-yellow-500 hover:bg-yellow-600 text-white rounded px-5 py-2 font-bold">Pagar con Culqi</button>
        } highlight />

        {/* ABOGADOS PRO */}
        <PlanCard title="Abogados PRO" price="29" color="green" features={[
          "Oficina Virtual Inteligente",
          "Gestión de expedientes y clientes",
          "LitisBot multidiomas avanzado",
          "Personalización de litigio en tiempo real",
          "Alertas por WhatsApp y email"
        ]}
        btn={
          <>
            <button onClick={() => handlePagar("Pro Abogado", 2900)} className="bg-green-600 hover:bg-green-700 text-white rounded px-5 py-2 font-bold mb-2">Pagar con Culqi</button>
            <div className="text-sm text-gray-700 mb-2">O paga con Yape/Plin/BBVA:</div>
            <img src="/img/qr-bbva.jpg" alt="QR BBVA" className="w-24 h-24 mx-auto rounded-xl border mb-2" />
            <a href="/subir-comprobante" className="text-blue-600 underline text-sm">Subir comprobante</a>
          </>
        } />
      </div>
      <script src="https://checkout.culqi.com/js/v4"></script>
    </div>
  );
}

// Componente reutilizable de tarjeta de plan
function PlanCard({ title, price, color, features, btn, highlight }) {
  const colorClass = {
    red: "text-red-600",
    blue: "text-blue-600",
    yellow: "text-yellow-700",
    green: "text-green-700"
  }[color] || "text-gray-800";
  const borderClass = highlight ? "border-2 border-yellow-400" : "border";
  return (
    <div className={`bg-white rounded-2xl shadow-md p-8 flex flex-col items-center relative ${borderClass}`}>
      {highlight && (
        <div className="absolute top-0 right-0 px-3 py-1 bg-yellow-200 rounded-bl-2xl text-xs font-bold">¡RECOMENDADO!</div>
      )}
      <h3 className={`text-2xl font-bold mb-2 ${colorClass}`}>{title}</h3>
      <span className="text-lg font-bold mb-4 text-gray-700">S/ {price}</span>
      <ul className="mb-6 text-gray-600 text-left space-y-2">
        {features.map((f, i) => <li key={i}>✓ {f}</li>)}
      </ul>
      {btn}
    </div>
  );
}
