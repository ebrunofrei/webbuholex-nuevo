import React, { useState, useEffect } from "react";
import useLegalOSStore from "@/store/useLegalOSStore";

const ModalUpgradePRO = ({ open, onClose }) => {
  const { usuarioId, guardarEnFirestore, setPlan } = useLegalOSStore();
  const [pagoCompletado, setPagoCompletado] = useState(false);
  const [loading, setLoading] = useState(false);

  // Handler seguro de pago con Culqi
  const handlePago = () => {
    if (!window.Culqi) return alert("El sistema de pagos no está disponible.");
    window.Culqi.publicKey = "tu_public_key";
    window.Culqi.settings({
      title: "BúhoLex PRO",
      currency: "PEN",
      amount: 1900,
      description: "Acceso PRO mensual",
    });
    window.Culqi.options({ lang: "auto" });
    window.Culqi.open();
  };

  // Solo se define 1 vez
  useEffect(() => {
    if (!open) return;
    window.culqi = async function () {
      if (window.Culqi && window.Culqi.token) {
        setLoading(true);
        try {
          const res = await fetch("/api/pago-culqi", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              token: window.Culqi.token.id,
              uid: usuarioId,
            }),
          });
          const data = await res.json();
          if (data.ok) {
            setPlan("pro");
            guardarEnFirestore();
            setPagoCompletado(true);
            setTimeout(() => {
              setPagoCompletado(false);
              onClose();
            }, 2200);
          } else {
            alert("Pago fallido: " + (data.msg || "Error Culqi"));
          }
        } catch (err) {
          alert("Error procesando pago");
        }
        setLoading(false);
      } else if (window.Culqi && window.Culqi.error) {
        alert(window.Culqi.error.user_message || "Error procesando pago");
      }
    };
    // Cleanup para evitar duplicidad si el modal se desmonta
    return () => {
      window.culqi = undefined;
    };
    // Solo al abrir/cerrar el modal
    // eslint-disable-next-line
  }, [open]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center">
      <div className="bg-white max-w-sm w-full p-5 rounded-lg shadow-xl relative">
        <button className="absolute top-2 right-3" onClick={onClose} disabled={loading}>✕</button>
        <h2 className="text-xl font-bold mb-2 text-[#b03a1a]">¡Hazte PRO!</h2>
        <ul className="text-base mb-2 pl-4 list-disc text-gray-700">
          <li>Acceso ilimitado a módulos avanzados (agenda, expedientes, archivos, etc.)</li>
          <li>Notificaciones y alertas automáticas</li>
          <li>Más almacenamiento y soporte prioritario</li>
        </ul>
        <button
          onClick={handlePago}
          disabled={loading}
          className="bg-[#b03a1a] text-white px-5 py-2 rounded font-bold mt-2 w-full"
        >
          {loading ? "Procesando..." : "Pagar S/.19.00 con Culqi"}
        </button>
        {pagoCompletado && (
          <div className="mt-3 text-green-600 font-bold">¡Pago exitoso! Ya eres PRO 🚀</div>
        )}
      </div>
    </div>
  );
};

export default ModalUpgradePRO;
